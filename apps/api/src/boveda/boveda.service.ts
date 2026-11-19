import { Injectable, Logger } from '@nestjs/common';
import type { CredencialEnBoveda } from '@repo/cliente';
import type { CredencialFirmada, Divulgacion } from '@repo/credenciales';
import { resumirEmisor, type Emisor } from '../emisores/emisor.entity.js';
import { EmisoresService } from '../emisores/emisores.service.js';
import { BovedaRepository } from './boveda.repository.js';
import { CifradoService } from './cifrado.service.js';

export interface ContenidoBoveda {
  credencial: CredencialFirmada;
  divulgaciones: Divulgacion[];
}

const contextoCifrado = (titularAddress: string, vcId: string) =>
  `boveda:${titularAddress}:${vcId}`;

/**
 * Bóveda del titular (ADR 0003): credenciales firmadas y divulgaciones
 * cifradas, indexadas por la cuenta del titular. Solo las lee su sesión.
 */
@Injectable()
export class BovedaService {
  private readonly logger = new Logger(BovedaService.name);

  constructor(
    private readonly repository: BovedaRepository,
    private readonly cifrado: CifradoService,
    private readonly emisores: EmisoresService,
  ) {}

  async guardar(datos: {
    titularAddress: string;
    emisorId: string;
    vcId: string;
    emitidaEn: string;
    contenido: ContenidoBoveda;
  }): Promise<void> {
    await this.repository.guardar({
      vcId: datos.vcId,
      titularAddress: datos.titularAddress,
      emisorId: datos.emisorId,
      contenidoCifrado: this.cifrado.cifrarJson(
        datos.contenido,
        contextoCifrado(datos.titularAddress, datos.vcId),
      ),
      emitidaEn: datos.emitidaEn,
      revocadaEn: null,
      motivoRevocacion: null,
    });
  }

  marcarRevocada(vcId: string, fecha: string, motivo: string): Promise<void> {
    return this.repository.marcarRevocada(vcId, fecha, motivo);
  }

  async listar(titularAddress: string): Promise<CredencialEnBoveda[]> {
    const entradas = await this.repository.listar(titularAddress);
    const emisores = new Map<string, Emisor>();
    const resultado: CredencialEnBoveda[] = [];
    for (const entrada of entradas) {
      let contenido: ContenidoBoveda;
      try {
        contenido = this.cifrado.descifrarJson<ContenidoBoveda>(
          entrada.contenidoCifrado,
          contextoCifrado(entrada.titularAddress, entrada.vcId),
        );
      } catch {
        this.logger.error(`No se pudo descifrar la credencial ${entrada.vcId}`);
        continue;
      }
      let emisor = emisores.get(entrada.emisorId);
      if (!emisor) {
        emisor = await this.emisores.findOne(entrada.emisorId);
        emisores.set(emisor.id, emisor);
      }
      resultado.push({
        vcId: entrada.vcId,
        credencial: contenido.credencial,
        divulgaciones: contenido.divulgaciones,
        emisor: resumirEmisor(emisor),
        estado: entrada.revocadaEn ? 'revocada' : 'valida',
        emitidaEn: entrada.emitidaEn,
        revocadaEn: entrada.revocadaEn,
        motivoRevocacion: entrada.motivoRevocacion,
      });
    }
    return resultado;
  }

  async listarBloqueos(titularAddress: string): Promise<Emisor[]> {
    const ids = await this.repository.listarBloqueos(titularAddress);
    return Promise.all(ids.map((id) => this.emisores.findOne(id)));
  }

  /** RF-02: el titular deja de recibir credenciales de ese emisor. */
  async bloquear(titularAddress: string, emisorId: string): Promise<void> {
    await this.emisores.findOne(emisorId);
    await this.repository.bloquear(titularAddress, emisorId);
  }

  desbloquear(titularAddress: string, emisorId: string): Promise<void> {
    return this.repository.desbloquear(titularAddress, emisorId);
  }

  estaBloqueado(titularAddress: string, emisorId: string): Promise<boolean> {
    return this.repository.estaBloqueado(titularAddress, emisorId);
  }
}
