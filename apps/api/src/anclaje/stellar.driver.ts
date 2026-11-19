import {
  BadGatewayException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { TransaccionPorFirmar } from '@repo/cliente';
import {
  claveAnclaje,
  claveRevocacion,
  estadoStellar,
  type EstadoCredencial,
} from '@repo/credenciales';
import {
  Account,
  BASE_FEE,
  NotFoundError,
  Operation,
  Transaction,
  TransactionBuilder,
  type Horizon,
} from '@stellar/stellar-sdk';
import type { StellarService } from '../stellar/stellar.service.js';
import {
  AnclajeDriver,
  type DatosEmisionAnclaje,
  type DatosEstadoCredencial,
  type DatosRevocacionAnclaje,
  type EstadoAnclaje,
  type OperacionAnclaje,
} from './anclaje.driver.js';

export const TIEMPO_LIMITE_TX_SEGUNDOS = 300;

const MENSAJES_TX: Record<string, string> = {
  tx_insufficient_balance:
    'La cuenta del emisor no tiene saldo suficiente para pagar la comisión y la reserva de la entrada de datos (0.5 XLM).',
  tx_insufficient_fee:
    'La comisión ofrecida es muy baja. Prepara la transacción de nuevo.',
  tx_bad_seq:
    'La transacción quedó desactualizada (número de secuencia). Prepárala y fírmala de nuevo.',
  tx_too_late:
    'La transacción venció antes de enviarse. Prepárala y fírmala de nuevo.',
  tx_too_early:
    'La transacción todavía no es válida. Intenta de nuevo en un momento.',
  tx_bad_auth: 'La transacción no tiene la firma de la cuenta del emisor.',
  tx_bad_auth_extra: 'La transacción tiene firmas de más.',
  tx_no_source_account: 'La cuenta del emisor no existe en la red.',
  tx_missing_operation: 'La transacción no tiene operaciones.',
};

const MENSAJES_OP: Record<string, string> = {
  op_low_reserve:
    'La cuenta del emisor no tiene saldo suficiente para la reserva de la entrada de datos (0.5 XLM).',
  op_underfunded: 'La cuenta del emisor no tiene saldo suficiente.',
  op_not_supported_yet: 'La operación no está disponible en esta red.',
  op_name_not_found: 'No existe la entrada de datos indicada.',
  op_invalid_name: 'El nombre de la entrada de datos no es válido.',
};

interface CodigosResultado {
  transaction?: string;
  operations?: string[];
}

/** Traduce los códigos de Horizon a un mensaje legible. */
export function mensajeErrorStellar(
  codigos: CodigosResultado | undefined,
): string {
  const op = codigos?.operations?.find((c) => c !== 'op_success');
  if (op && MENSAJES_OP[op]) return MENSAJES_OP[op];
  const tx = codigos?.transaction;
  if (tx && MENSAJES_TX[tx]) return MENSAJES_TX[tx];
  const detalle = [tx, ...(codigos?.operations ?? [])]
    .filter(Boolean)
    .join(', ');
  return `Stellar rechazó la transacción${detalle ? ` (${detalle})` : ''}.`;
}

function codigosDe(error: unknown): CodigosResultado | undefined {
  const respuesta = (error as { response?: { data?: unknown } })?.response;
  const datos = respuesta?.data as
    { extras?: { result_codes?: CodigosResultado } } | undefined;
  return datos?.extras?.result_codes;
}

function decodificarValor(valor: string | undefined): Buffer | null {
  return valor ? Buffer.from(valor, 'base64') : null;
}

/** Interpreta las entradas `c:`/`r:` de la cuenta (valores en base64). */
export function estadoDesdeDatos(
  datos: Record<string, string>,
  vcId: string,
): EstadoAnclaje {
  const hash = decodificarValor(datos[claveAnclaje(vcId)]);
  const revocacion = decodificarValor(datos[claveRevocacion(vcId)]);
  let revocadaEn: string | null = null;
  if (revocacion) {
    const segundos = Number(revocacion.toString('ascii'));
    revocadaEn = Number.isFinite(segundos)
      ? new Date(segundos * 1000).toISOString()
      : new Date(0).toISOString();
  }
  return {
    anclado: hash !== null && hash.length === 32,
    hashHex: hash ? hash.toString('hex') : null,
    revocadaEn,
  };
}

/** Transacción clásica con una operación `manageData` en la cuenta del emisor. */
export function construirTransaccionDatos(
  cuenta: Account,
  passphrase: string,
  nombre: string,
  valor: Buffer,
  fee: string = BASE_FEE,
): Transaction {
  return new TransactionBuilder(cuenta, { fee, networkPassphrase: passphrase })
    .addOperation(Operation.manageData({ name: nombre, value: valor }))
    .setTimeout(TIEMPO_LIMITE_TX_SEGUNDOS)
    .build();
}

/**
 * Driver `stellar` (ADR 0001): ancla el hash con `manageData` en la cuenta del
 * emisor. Cualquiera puede verificar leyendo Horizon (RNF-07).
 */
export class StellarAnclajeDriver extends AnclajeDriver {
  readonly tipo = 'stellar' as const;
  private readonly logger = new Logger(StellarAnclajeDriver.name);

  constructor(private readonly stellar: StellarService) {
    super();
  }

  private get horizon(): Horizon.Server {
    return this.stellar.horizon;
  }

  estadoCredencial(datos: DatosEstadoCredencial): EstadoCredencial {
    return estadoStellar(this.stellar.network, datos.emisorAddress, datos.vcId);
  }

  async prepararEmision(
    datos: DatosEmisionAnclaje,
  ): Promise<TransaccionPorFirmar> {
    return this.preparar(
      datos.emisorAddress,
      claveAnclaje(datos.vcId),
      Buffer.from(datos.hashHex, 'hex'),
    );
  }

  async prepararRevocacion(
    datos: DatosRevocacionAnclaje,
  ): Promise<TransaccionPorFirmar> {
    const segundos = Math.floor(datos.fecha.getTime() / 1000);
    return this.preparar(
      datos.emisorAddress,
      claveRevocacion(datos.vcId),
      Buffer.from(String(segundos), 'ascii'),
    );
  }

  async enviar(
    signedXdr: string,
    _operacion: OperacionAnclaje,
  ): Promise<{ txHash: string }> {
    const tx = TransactionBuilder.fromXDR(signedXdr, this.stellar.passphrase);
    try {
      const resultado = await this.horizon.submitTransaction(tx);
      return { txHash: resultado.hash };
    } catch (error) {
      const codigos = codigosDe(error);
      if (codigos) {
        throw new UnprocessableEntityException(mensajeErrorStellar(codigos));
      }
      this.logger.error(
        `Error al enviar a Horizon: ${(error as Error).message}`,
      );
      throw new BadGatewayException(
        'No se pudo enviar la transacción a Stellar. Intenta de nuevo en un momento.',
      );
    }
  }

  async consultar({
    estado,
  }: {
    estado: EstadoCredencial;
  }): Promise<EstadoAnclaje> {
    if (estado.type !== 'StellarDataEntryStatus') {
      return { anclado: false, hashHex: null, revocadaEn: null };
    }
    try {
      const cuenta = await this.horizon
        .accounts()
        .accountId(estado.cuenta)
        .call();
      return estadoDesdeDatos(cuenta.data_attr, estado.vcId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return { anclado: false, hashHex: null, revocadaEn: null };
      }
      throw error;
    }
  }

  private async preparar(
    emisorAddress: string,
    nombre: string,
    valor: Buffer,
  ): Promise<TransaccionPorFirmar> {
    let cuenta: Account;
    try {
      const respuesta = await this.horizon.loadAccount(emisorAddress);
      cuenta = new Account(respuesta.accountId(), respuesta.sequenceNumber());
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new UnprocessableEntityException(
          `La cuenta del emisor no existe en ${this.stellar.network}`,
        );
      }
      throw new BadGatewayException(
        'No se pudo consultar la cuenta del emisor en Stellar. Intenta de nuevo.',
      );
    }
    let fee = BASE_FEE;
    try {
      fee = String(await this.horizon.fetchBaseFee());
    } catch {
      // Si Horizon no responde la comisión base, se usa la mínima.
    }
    const tx = construirTransaccionDatos(
      cuenta,
      this.stellar.passphrase,
      nombre,
      valor,
      fee,
    );
    return { xdr: tx.toXDR(), networkPassphrase: this.stellar.passphrase };
  }
}
