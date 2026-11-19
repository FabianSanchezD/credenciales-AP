import { UnprocessableEntityException } from '@nestjs/common';
import type { TransaccionPorFirmar } from '@repo/cliente';
import {
  claveAnclaje,
  claveRevocacion,
  estadoStellar,
  type EstadoCredencial,
} from '@repo/credenciales';
import type { StellarNetwork } from '@repo/stellar';
import {
  Account,
  Keypair,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import {
  AnclajeDriver,
  type DatosEmisionAnclaje,
  type DatosEstadoCredencial,
  type DatosRevocacionAnclaje,
  type EstadoAnclaje,
  type OperacionAnclaje,
} from './anclaje.driver.js';
import {
  construirTransaccionDatos,
  estadoDesdeDatos,
} from './stellar.driver.js';

/**
 * Driver `memoria` (solo NODE_ENV=test): mismas transacciones que el driver
 * `stellar`, pero las entradas de datos se aplican en memoria.
 */
export class MemoriaAnclajeDriver extends AnclajeDriver {
  readonly tipo = 'stellar' as const;
  /** cuenta -> entradas de datos (valores en base64, como Horizon). */
  private readonly cuentas = new Map<string, Record<string, string>>();
  private readonly secuencias = new Map<string, bigint>();

  constructor(
    private readonly network: StellarNetwork,
    private readonly passphrase: string,
  ) {
    super();
  }

  estadoCredencial(datos: DatosEstadoCredencial): EstadoCredencial {
    return estadoStellar(this.network, datos.emisorAddress, datos.vcId);
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
    return this.preparar(
      datos.emisorAddress,
      claveRevocacion(datos.vcId),
      Buffer.from(String(Math.floor(datos.fecha.getTime() / 1000)), 'ascii'),
    );
  }

  async enviar(
    signedXdr: string,
    _operacion: OperacionAnclaje,
  ): Promise<{ txHash: string }> {
    const tx = TransactionBuilder.fromXDR(signedXdr, this.passphrase);
    if (!(tx instanceof Transaction)) {
      throw new UnprocessableEntityException('Transacción no soportada');
    }
    const firmante = Keypair.fromPublicKey(tx.source);
    const firmada = tx.signatures.some((firma) =>
      firmante.verify(tx.hash(), firma.signature()),
    );
    if (!firmada) {
      throw new UnprocessableEntityException(
        'La transacción no tiene la firma de la cuenta del emisor.',
      );
    }
    const datos = this.cuentas.get(tx.source) ?? {};
    for (const op of tx.operations) {
      if (op.type !== 'manageData') continue;
      if (op.value === undefined) delete datos[op.name];
      else datos[op.name] = Buffer.from(op.value).toString('base64');
    }
    this.cuentas.set(tx.source, datos);
    this.secuencias.set(tx.source, BigInt(tx.sequence));
    return { txHash: tx.hash().toString('hex') };
  }

  async consultar({
    estado,
  }: {
    estado: EstadoCredencial;
  }): Promise<EstadoAnclaje> {
    if (estado.type !== 'StellarDataEntryStatus') {
      return { anclado: false, hashHex: null, revocadaEn: null };
    }
    return estadoDesdeDatos(this.cuentas.get(estado.cuenta) ?? {}, estado.vcId);
  }

  private preparar(
    emisorAddress: string,
    nombre: string,
    valor: Buffer,
  ): TransaccionPorFirmar {
    const secuencia = this.secuencias.get(emisorAddress) ?? 0n;
    const tx = construirTransaccionDatos(
      new Account(emisorAddress, secuencia.toString()),
      this.passphrase,
      nombre,
      valor,
    );
    return { xdr: tx.toXDR(), networkPassphrase: this.passphrase };
  }
}
