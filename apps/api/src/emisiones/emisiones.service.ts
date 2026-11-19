import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  EmisionFirmada,
  EmisionPreparada,
  RevocacionPreparada,
} from '@repo/cliente';
import {
  adjuntarPrueba,
  construirCredencial,
  hashCredencial,
  mensajeDeFirma,
  verificarFirmaMensaje,
  type AtributosSeleccionables,
  type Credencial,
  type CredencialFirmada,
  type Divulgacion,
  type FirmaMensaje,
} from '@repo/credenciales';
import {
  FeeBumpTransaction,
  Keypair,
  TransactionBuilder,
  type Transaction,
} from '@stellar/stellar-sdk';
import { randomUUID } from 'node:crypto';
import { AnclajeDriver } from '../anclaje/anclaje.driver.js';
import { BovedaService } from '../boveda/boveda.service.js';
import { CifradoService } from '../boveda/cifrado.service.js';
import type { Emisor } from '../emisores/emisor.entity.js';
import { EmisoresService } from '../emisores/emisores.service.js';
import { PlantillasService } from '../plantillas/plantillas.service.js';
import { StellarService } from '../stellar/stellar.service.js';
import {
  aEmision,
  type Emision,
  type RegistroEmision,
} from './emision.entity.js';
import type { PrepararEmisionDto } from './emisiones.schemas.js';
import { EmisionesRepository } from './emisiones.repository.js';

interface ContenidoEmision {
  credencial: Credencial | CredencialFirmada;
  divulgaciones: Divulgacion[];
}

const contextoCifrado = (id: string) => `emision:${id}`;

/**
 * Flujo de emisión (sección 5.2) y revocación (5.4):
 * `borrador` -> `firmada` -> `emitida` -> `revocada`.
 * El emisor firma la credencial y la transacción en su wallet: la API nunca
 * toca llaves privadas (RNF-02).
 */
@Injectable()
export class EmisionesService {
  constructor(
    private readonly repository: EmisionesRepository,
    private readonly emisores: EmisoresService,
    private readonly plantillas: PlantillasService,
    private readonly boveda: BovedaService,
    private readonly cifrado: CifradoService,
    private readonly anclaje: AnclajeDriver,
    private readonly stellar: StellarService,
  ) {}

  async listar(address: string): Promise<Emision[]> {
    const emisor = await this.emisores.findByAddress(address);
    if (!emisor) return [];
    return (await this.repository.findByEmisor(emisor.id)).map(aEmision);
  }

  async obtener(address: string, id: string): Promise<Emision> {
    const emisor = await this.emisores.delaCuenta(address);
    return aEmision(await this.registro(emisor.id, id));
  }

  async preparar(
    address: string,
    dto: PrepararEmisionDto,
  ): Promise<EmisionPreparada> {
    const emisor = await this.emisorAutorizado(address);
    const plantilla = await this.plantillas.deEmisor(
      emisor.id,
      dto.plantillaId,
    );
    if (plantilla.archivada) {
      throw new ConflictException('La plantilla está archivada');
    }
    const titular = this.stellar.parseDid(dto.titularDid);
    if (!titular) {
      throw new BadRequestException(
        `El DID del titular debe ser did:stellar:${this.stellar.network}:<cuenta G…>`,
      );
    }
    if (await this.boveda.estaBloqueado(titular.address, emisor.id)) {
      throw new ForbiddenException(
        'El titular bloqueó a esta institución y no recibe sus credenciales',
      );
    }

    const vcId = randomUUID();
    const atributos: AtributosSeleccionables = {
      nombreTitular: dto.titularNombre,
      ...(dto.identificacion !== undefined && { identificacion: dto.identificacion }),
      resultadosAprendizaje: plantilla.resultadosAprendizaje,
      temasEvaluados: plantilla.temasEvaluados,
      contexto: plantilla.contexto,
      ...(dto.calificacion !== undefined && { calificacion: dto.calificacion }),
    };
    const { credencial, divulgaciones } = construirCredencial({
      vcId,
      emisor: { did: emisor.did, nombre: emisor.nombre },
      titularDid: titular.did,
      logro: { nombre: plantilla.nombre, descripcion: plantilla.descripcion },
      atributos,
      emitidaEn: new Date(),
      vigenciaMeses: plantilla.vigenciaMeses,
      estado: this.anclaje.estadoCredencial({
        vcId,
        emisorAddress: emisor.stellarAddress,
        titularAddress: titular.address,
      }),
    });

    const registro = await this.repository.save({
      id: vcId,
      emisorId: emisor.id,
      plantillaId: plantilla.id,
      plantillaNombre: plantilla.nombre,
      titularDid: titular.did,
      titularAddress: titular.address,
      estado: 'borrador',
      conContexto:
        atributos.resultadosAprendizaje.length > 0 &&
        atributos.contexto !== undefined,
      contenidoCifrado: this.cifrar(vcId, { credencial, divulgaciones }),
      hash: null,
      txPreparada: null,
      txHash: null,
      emitidaEn: null,
      revocacionPendiente: null,
      revocadaEn: null,
      motivoRevocacion: null,
      txRevocacion: null,
      creadaEn: new Date().toISOString(),
    });
    return {
      emision: aEmision(registro),
      mensajeAFirmar: mensajeDeFirma(credencial),
    };
  }

  /**
   * Recibe la firma SEP-53 de la credencial y prepara la transacción de
   * anclaje. Se puede repetir mientras no se haya enviado (p. ej. si la
   * transacción venció).
   */
  async firmar(
    address: string,
    id: string,
    firma: FirmaMensaje,
  ): Promise<EmisionFirmada> {
    const emisor = await this.emisores.delaCuenta(address);
    const registro = await this.registro(emisor.id, id);
    if (registro.estado !== 'borrador' && registro.estado !== 'firmada') {
      throw new ConflictException('La credencial ya fue emitida');
    }
    if (firma.publicKey !== emisor.stellarAddress) {
      throw new ForbiddenException(
        'La credencial debe firmarla la cuenta Stellar del emisor',
      );
    }
    const contenido = this.descifrar(registro);
    if (!verificarFirmaMensaje(mensajeDeFirma(contenido.credencial), firma)) {
      throw new BadRequestException(
        'La firma no corresponde a la credencial preparada',
      );
    }

    const credencial = adjuntarPrueba(contenido.credencial, firma);
    const hash = hashCredencial(credencial);
    const transaccion = await this.anclaje.prepararEmision({
      vcId: registro.id,
      hashHex: hash,
      credencial,
      emisorAddress: emisor.stellarAddress,
      titularAddress: registro.titularAddress,
    });

    const actualizado = await this.repository.save({
      ...registro,
      estado: 'firmada',
      hash,
      contenidoCifrado: this.cifrar(registro.id, {
        credencial,
        divulgaciones: contenido.divulgaciones,
      }),
      txPreparada: this.hashTransaccion(transaccion.xdr),
    });
    return { emision: aEmision(actualizado), transaccion };
  }

  async enviar(
    address: string,
    id: string,
    signedXdr: string,
  ): Promise<Emision> {
    const emisor = await this.emisores.delaCuenta(address);
    const registro = await this.registro(emisor.id, id);
    if (registro.estado !== 'firmada' || !registro.txPreparada) {
      throw new ConflictException(
        registro.estado === 'borrador'
          ? 'Primero firma la credencial'
          : 'La credencial ya fue emitida',
      );
    }
    this.exigirTransaccion(signedXdr, registro.txPreparada, emisor);
    const { txHash } = await this.anclaje.enviar(signedXdr, 'emision');

    const emitidaEn = new Date().toISOString();
    const contenido = this.descifrar(registro);
    await this.boveda.guardar({
      titularAddress: registro.titularAddress,
      emisorId: emisor.id,
      vcId: registro.id,
      emitidaEn,
      contenido: {
        credencial: contenido.credencial as CredencialFirmada,
        divulgaciones: contenido.divulgaciones,
      },
    });
    const actualizado = await this.repository.save({
      ...registro,
      estado: 'emitida',
      txHash,
      emitidaEn,
    });
    return aEmision(actualizado);
  }

  /** Solo el emisor que emitió puede revocar; el titular no (sección 5.4). */
  async prepararRevocacion(
    address: string,
    id: string,
    motivo: string,
  ): Promise<RevocacionPreparada> {
    const emisor = await this.emisores.delaCuenta(address);
    const registro = await this.registro(emisor.id, id);
    if (registro.estado !== 'emitida') {
      throw new ConflictException(
        registro.estado === 'revocada'
          ? 'La credencial ya está revocada'
          : 'Solo se puede revocar una credencial emitida',
      );
    }
    const fecha = new Date();
    const transaccion = await this.anclaje.prepararRevocacion({
      vcId: registro.id,
      emisorAddress: emisor.stellarAddress,
      titularAddress: registro.titularAddress,
      fecha,
    });
    const actualizado = await this.repository.save({
      ...registro,
      revocacionPendiente: {
        motivo,
        // El anclaje guarda segundos: se descartan los milisegundos.
        fecha: new Date(
          Math.floor(fecha.getTime() / 1000) * 1000,
        ).toISOString(),
        txPreparada: this.hashTransaccion(transaccion.xdr),
      },
    });
    return { emision: aEmision(actualizado), transaccion };
  }

  async enviarRevocacion(
    address: string,
    id: string,
    signedXdr: string,
  ): Promise<Emision> {
    const emisor = await this.emisores.delaCuenta(address);
    const registro = await this.registro(emisor.id, id);
    const pendiente = registro.revocacionPendiente;
    if (registro.estado !== 'emitida' || !pendiente) {
      throw new ConflictException(
        registro.estado === 'revocada'
          ? 'La credencial ya está revocada'
          : 'Primero prepara la revocación',
      );
    }
    this.exigirTransaccion(signedXdr, pendiente.txPreparada, emisor);
    const { txHash } = await this.anclaje.enviar(signedXdr, 'revocacion');

    await this.boveda.marcarRevocada(
      registro.id,
      pendiente.fecha,
      pendiente.motivo,
    );
    const actualizado = await this.repository.save({
      ...registro,
      estado: 'revocada',
      revocadaEn: pendiente.fecha,
      motivoRevocacion: pendiente.motivo,
      txRevocacion: txHash,
      revocacionPendiente: null,
    });
    return aEmision(actualizado);
  }

  private async emisorAutorizado(address: string): Promise<Emisor> {
    const emisor = await this.emisores.delaCuenta(address);
    if (emisor.estado !== 'autorizado') {
      throw new ForbiddenException(
        emisor.estado === 'suspendido'
          ? 'Tu institución está suspendida y no puede emitir credenciales'
          : 'Tu institución aún no está autorizada para emitir credenciales',
      );
    }
    return emisor;
  }

  private async registro(
    emisorId: string,
    id: string,
  ): Promise<RegistroEmision> {
    const registro = await this.repository.findById(emisorId, id);
    if (!registro) {
      throw new NotFoundException(`No existe la emisión ${id}`);
    }
    return registro;
  }

  private cifrar(id: string, contenido: ContenidoEmision): string {
    return this.cifrado.cifrarJson(contenido, contextoCifrado(id));
  }

  private descifrar(registro: RegistroEmision): ContenidoEmision {
    return this.cifrado.descifrarJson<ContenidoEmision>(
      registro.contenidoCifrado,
      contextoCifrado(registro.id),
    );
  }

  private parsearTransaccion(xdr: string): Transaction {
    let tx;
    try {
      tx = TransactionBuilder.fromXDR(xdr, this.stellar.passphrase);
    } catch {
      throw new BadRequestException(
        'La transacción firmada no es un XDR válido',
      );
    }
    if (tx instanceof FeeBumpTransaction) {
      throw new BadRequestException('No se aceptan transacciones fee bump');
    }
    return tx;
  }

  private hashTransaccion(xdr: string): string {
    return this.parsearTransaccion(xdr).hash().toString('hex');
  }

  /** La transacción es exactamente la preparada y la firmó el emisor. */
  private exigirTransaccion(
    signedXdr: string,
    esperada: string,
    emisor: Emisor,
  ): void {
    const tx = this.parsearTransaccion(signedXdr);
    const hash = tx.hash();
    if (hash.toString('hex') !== esperada) {
      throw new BadRequestException(
        'La transacción firmada no es la que preparó la plataforma',
      );
    }
    const llave = Keypair.fromPublicKey(emisor.stellarAddress);
    const pista = llave.signatureHint();
    const firmada = tx.signatures.some(
      (firma) =>
        Buffer.from(firma.hint()).equals(pista) &&
        llave.verify(hash, firma.signature()),
    );
    if (!firmada) {
      throw new BadRequestException(
        'La transacción no tiene la firma de la cuenta del emisor',
      );
    }
  }
}
