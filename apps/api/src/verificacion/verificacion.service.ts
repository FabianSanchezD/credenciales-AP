import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Comprobacion, ResultadoVerificacion } from '@repo/cliente';
import {
  atributosRevelados,
  decodificarPresentacion,
  divulgacionesValidas,
  hashCredencial,
  presentacionSchema,
  verificarPrueba,
  type CredencialFirmada,
  type Presentacion,
} from '@repo/credenciales';
import { parseDidStellar } from '@repo/stellar';
import {
  AnclajeDriver,
  type EstadoAnclaje,
} from '../anclaje/anclaje.driver.js';
import { resumirEmisor, type Emisor } from '../emisores/emisor.entity.js';
import { EmisoresService } from '../emisores/emisores.service.js';
import type { VerificarDto } from './verificacion.schemas.js';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'long',
  timeZone: 'America/Costa_Rica',
});

function fecha(iso: string): string {
  const valor = new Date(iso);
  return Number.isNaN(valor.getTime()) ? iso : FORMATO_FECHA.format(valor);
}

/**
 * Verificación pública (sección 5.3, ADR 0004). Salvaguarda de privacidad:
 * la presentación nunca se guarda ni se registra en logs.
 */
@Injectable()
export class VerificacionService {
  private readonly logger = new Logger(VerificacionService.name);

  constructor(
    private readonly anclaje: AnclajeDriver,
    private readonly emisores: EmisoresService,
  ) {}

  async verificar(dto: VerificarDto): Promise<ResultadoVerificacion> {
    const inicio = performance.now();
    const presentacion = await this.leerPresentacion(dto);
    const { credencial, divulgaciones } = presentacion;

    const firma = this.comprobarFirma(credencial);

    let consulta: EstadoAnclaje | null = null;
    try {
      consulta = await this.anclaje.consultar({
        estado: credencial.credentialStatus,
      });
    } catch (error) {
      // Solo el error: nunca el contenido de la presentación.
      this.logger.warn(
        `No se pudo consultar el anclaje: ${(error as Error).message}`,
      );
    }
    const divulgacionesOk = divulgacionesValidas(credencial, divulgaciones);
    const integridad = this.comprobarIntegridad(
      credencial,
      consulta,
      divulgacionesOk,
    );
    const { comprobacion: estado, revocada } = this.comprobarEstado(
      credencial,
      consulta,
    );
    const { comprobacion: emisorOk, emisor } =
      await this.comprobarEmisor(credencial);

    const comprobaciones = [firma, integridad, estado, emisorOk];
    let resultado: ResultadoVerificacion['resultado'] = 'invalida';
    if (comprobaciones.every((c) => c.ok)) {
      resultado = 'valida';
    } else if (revocada && firma.ok && integridad.ok && emisorOk.ok) {
      resultado = 'revocada';
    }

    return {
      resultado,
      comprobaciones,
      emisor: emisor ? resumirEmisor(emisor) : null,
      emisorDeclarado: {
        did: credencial.issuer.id,
        nombre: credencial.issuer.name,
      },
      logro: credencial.credentialSubject.logro,
      titularDid: credencial.credentialSubject.id,
      emitidaEn: credencial.validFrom,
      validaHasta: credencial.validUntil ?? null,
      revocadaEn: consulta?.anclado ? consulta.revocadaEn : null,
      atributos: divulgacionesOk ? atributosRevelados(divulgaciones) : {},
      verificadaEn: new Date().toISOString(),
      duracionMs: Math.round(performance.now() - inicio),
    };
  }

  private async leerPresentacion(dto: VerificarDto): Promise<Presentacion> {
    if ('codigo' in dto) {
      try {
        return await decodificarPresentacion(dto.codigo);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'El código de la presentación no es válido',
        );
      }
    }
    const resultado = presentacionSchema.safeParse(dto.presentacion);
    if (!resultado.success) {
      throw new BadRequestException(
        'La presentación no tiene el formato esperado',
      );
    }
    return resultado.data;
  }

  private comprobarFirma(credencial: CredencialFirmada): Comprobacion {
    const ok = verificarPrueba(credencial);
    return {
      id: 'firma',
      ok,
      detalle: ok
        ? `La firma digital corresponde a ${credencial.issuer.name}, la institución que aparece como emisora.`
        : 'La firma digital no corresponde a la institución que aparece como emisora: la credencial fue alterada o no la emitió esa institución.',
    };
  }

  private comprobarIntegridad(
    credencial: CredencialFirmada,
    consulta: EstadoAnclaje | null,
    divulgacionesOk: boolean,
  ): Comprobacion {
    let detalle: string;
    let ok = false;
    if (!consulta) {
      detalle =
        'No se pudo consultar el registro público en este momento. Intenta de nuevo en unos minutos.';
    } else if (!consulta.anclado) {
      detalle =
        'No se encontró el registro público de esta credencial en la red Stellar: la institución no la emitió o los datos fueron cambiados.';
    } else if (consulta.hashHex !== hashCredencial(credencial)) {
      detalle =
        'El contenido no coincide con el registro público: la credencial fue modificada después de emitirse.';
    } else if (!divulgacionesOk) {
      detalle =
        'Uno o más datos revelados no coinciden con los que firmó la institución: fueron alterados.';
    } else {
      ok = true;
      detalle =
        'El contenido coincide con el registro público en Stellar y los datos revelados son los que firmó la institución.';
    }
    return { id: 'integridad', ok, detalle };
  }

  private comprobarEstado(
    credencial: CredencialFirmada,
    consulta: EstadoAnclaje | null,
  ): { comprobacion: Comprobacion; revocada: boolean } {
    if (!consulta?.anclado) {
      return {
        revocada: false,
        comprobacion: {
          id: 'estado',
          ok: false,
          detalle:
            'No se pudo confirmar el estado porque la credencial no tiene registro público.',
        },
      };
    }
    if (consulta.revocadaEn) {
      return {
        revocada: true,
        comprobacion: {
          id: 'estado',
          ok: false,
          detalle: `La institución revocó esta credencial el ${fecha(consulta.revocadaEn)}. Ya no es válida.`,
        },
      };
    }
    if (
      credencial.validUntil &&
      Date.parse(credencial.validUntil) <= Date.now()
    ) {
      return {
        revocada: false,
        comprobacion: {
          id: 'estado',
          ok: false,
          detalle: `La credencial está vencida: su vigencia terminó el ${fecha(credencial.validUntil)}.`,
        },
      };
    }
    return {
      revocada: false,
      comprobacion: {
        id: 'estado',
        ok: true,
        detalle: credencial.validUntil
          ? `La credencial está vigente hasta el ${fecha(credencial.validUntil)} y no ha sido revocada.`
          : 'La credencial está vigente y no ha sido revocada.',
      },
    };
  }

  private async comprobarEmisor(
    credencial: CredencialFirmada,
  ): Promise<{ comprobacion: Comprobacion; emisor: Emisor | null }> {
    const did = parseDidStellar(credencial.issuer.id);
    const emisor = did ? await this.emisores.findByAddress(did.address) : null;
    if (!emisor || emisor.did !== credencial.issuer.id) {
      return {
        emisor: null,
        comprobacion: {
          id: 'emisor',
          ok: false,
          detalle:
            'La institución emisora no está en el registro de confianza de la plataforma.',
        },
      };
    }
    const emitida = Date.parse(credencial.validFrom);
    let ok = false;
    let detalle: string;
    if (emisor.estado === 'autorizado') {
      ok = true;
      detalle = `${emisor.nombre} está autorizada por la entidad que acredita.`;
    } else if (
      emisor.estado === 'suspendido' &&
      emisor.suspendidoEn &&
      Date.parse(emisor.suspendidoEn) > emitida
    ) {
      ok = true;
      detalle = `${emisor.nombre} estaba autorizada cuando emitió la credencial. Hoy está suspendida, pero eso no afecta credenciales anteriores.`;
    } else if (emisor.estado === 'suspendido') {
      detalle = `${emisor.nombre} estaba suspendida cuando se emitió la credencial.`;
    } else {
      detalle = `${emisor.nombre} todavía no ha sido autorizada por la entidad que acredita.`;
    }
    return { emisor, comprobacion: { id: 'emisor', ok, detalle } };
  }
}
