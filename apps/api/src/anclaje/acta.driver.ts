import {
  BadGatewayException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { TransaccionPorFirmar } from '@repo/cliente';
import {
  credencialSchema,
  estadoActa,
  hashCredencial,
  pruebaSchema,
  type CredencialFirmada,
  type EstadoCredencial,
} from '@repo/credenciales';
import type { StellarNetwork } from '@repo/stellar';
import {
  AnclajeDriver,
  type DatosEmisionAnclaje,
  type DatosEstadoCredencial,
  type DatosRevocacionAnclaje,
  type EstadoAnclaje,
  type OperacionAnclaje,
} from './anclaje.driver.js';

type RespuestaTx = { xdr: string; network: string } | { tx_id: string };

/**
 * Subconjunto de `ActaClient` (`@acta-team/credentials` 1.1.10) que usa el
 * driver. Permite probarlo con un cliente simulado.
 */
export interface ClienteActa {
  vcIssue: (
    payload:
      | {
          owner: string;
          vcId: string;
          vcData: string;
          issuer: string;
          sourcePublicKey?: string;
        }
      | { signedXdr: string },
  ) => Promise<RespuestaTx>;
  revokeCredentialViaApi: (
    payload:
      | { owner: string; vcId: string; date?: string; sourcePublicKey?: string }
      | { signedXdr: string },
  ) => Promise<RespuestaTx>;
  vaultVerify: (args: {
    owner: string;
    vcId: string;
  }) => Promise<{ status: 'valid' | 'revoked'; since?: string }>;
  vaultGetVcDirect: (args: {
    owner: string;
    vcId: string;
  }) => Promise<{ vc?: unknown; result?: unknown }>;
}

const credencialFirmadaSchema = credencialSchema.extend({
  proof: pruebaSchema,
});

function mensajeActa(error: unknown): string {
  const { status, message } = (error ?? {}) as {
    status?: number;
    message?: string;
  };
  if (status === 401 || status === 403) {
    return 'ACTA rechazó la API key configurada (ACTA_API_KEY).';
  }
  if (status === 402) {
    return 'La cuenta del emisor no tiene saldo suficiente para la comisión de ACTA.';
  }
  return `ACTA no pudo procesar la solicitud${message ? `: ${message}` : ''}.`;
}

function esNoEncontrado(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === 404;
}

/**
 * Driver `acta` (ADR 0001): la credencial firmada se guarda en la bóveda ACTA
 * del titular (`vc-vault`) y el estado se consulta en el contrato.
 */
export class ActaAnclajeDriver extends AnclajeDriver {
  readonly tipo = 'acta' as const;
  private readonly logger = new Logger(ActaAnclajeDriver.name);

  constructor(
    private readonly cliente: ClienteActa,
    private readonly network: StellarNetwork,
    private readonly passphrase: string,
  ) {
    super();
  }

  estadoCredencial(datos: DatosEstadoCredencial): EstadoCredencial {
    return estadoActa(this.network, datos.titularAddress, datos.vcId);
  }

  async prepararEmision(
    datos: DatosEmisionAnclaje,
  ): Promise<TransaccionPorFirmar> {
    const respuesta = await this.llamar(() =>
      this.cliente.vcIssue({
        owner: datos.titularAddress,
        vcId: datos.vcId,
        vcData: JSON.stringify(datos.credencial),
        issuer: datos.emisorAddress,
        sourcePublicKey: datos.emisorAddress,
      }),
    );
    return this.comoPreparada(respuesta);
  }

  async prepararRevocacion(
    datos: DatosRevocacionAnclaje,
  ): Promise<TransaccionPorFirmar> {
    const respuesta = await this.llamar(() =>
      this.cliente.revokeCredentialViaApi({
        owner: datos.titularAddress,
        vcId: datos.vcId,
        date: datos.fecha.toISOString(),
        sourcePublicKey: datos.emisorAddress,
      }),
    );
    return this.comoPreparada(respuesta);
  }

  async enviar(
    signedXdr: string,
    operacion: OperacionAnclaje,
  ): Promise<{ txHash: string }> {
    const respuesta = await this.llamar(() =>
      operacion === 'emision'
        ? this.cliente.vcIssue({ signedXdr })
        : this.cliente.revokeCredentialViaApi({ signedXdr }),
    );
    if (!('tx_id' in respuesta)) {
      throw new BadGatewayException(
        'ACTA no devolvió el hash de la transacción.',
      );
    }
    return { txHash: respuesta.tx_id };
  }

  async consultar({
    estado,
  }: {
    estado: EstadoCredencial;
  }): Promise<EstadoAnclaje> {
    if (estado.type !== 'ActaVaultStatus') {
      return { anclado: false, hashHex: null, revocadaEn: null };
    }
    const args = { owner: estado.cuenta, vcId: estado.vcId };
    try {
      const [verificacion, lectura] = await Promise.all([
        this.cliente.vaultVerify(args),
        this.cliente.vaultGetVcDirect(args),
      ]);
      const hashHex = this.hashDe(lectura.vc ?? lectura.result);
      return {
        anclado: hashHex !== null,
        hashHex,
        revocadaEn:
          verificacion.status === 'revoked'
            ? (verificacion.since ?? new Date(0).toISOString())
            : null,
      };
    } catch (error) {
      if (esNoEncontrado(error)) {
        return { anclado: false, hashHex: null, revocadaEn: null };
      }
      throw new BadGatewayException(mensajeActa(error));
    }
  }

  /** Recalcula el hash de la credencial guardada en la bóveda ACTA. */
  private hashDe(vc: unknown): string | null {
    let valor = vc;
    if (typeof valor === 'string') {
      try {
        valor = JSON.parse(valor);
      } catch {
        return null;
      }
    }
    const parseada = credencialFirmadaSchema.safeParse(valor);
    return parseada.success
      ? hashCredencial(parseada.data as CredencialFirmada)
      : null;
  }

  private comoPreparada(respuesta: RespuestaTx): TransaccionPorFirmar {
    if (!('xdr' in respuesta)) {
      throw new BadGatewayException(
        'ACTA no devolvió una transacción para firmar.',
      );
    }
    return { xdr: respuesta.xdr, networkPassphrase: this.passphrase };
  }

  private async llamar<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.logger.error(`Error de ACTA: ${(error as Error)?.message ?? error}`);
      const status = (error as { status?: number } | null)?.status ?? 0;
      if (status >= 400 && status < 500) {
        throw new UnprocessableEntityException(mensajeActa(error));
      }
      throw new BadGatewayException(mensajeActa(error));
    }
  }
}
