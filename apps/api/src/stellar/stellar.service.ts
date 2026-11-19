import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getAccountState,
  getNetworkConfig,
  parseDidStellar,
  toDidStellar,
  type DidStellar,
  type StellarAccountState,
  type StellarNetworkConfig,
} from '@repo/stellar';
import { Horizon } from '@stellar/stellar-sdk';
import type { Env } from '../config/env.js';

export interface FirmanteCuenta {
  key: string;
  weight: number;
}

export interface FirmantesCuenta {
  /** La cuenta ya fue creada on-chain. */
  exists: boolean;
  firmantes: FirmanteCuenta[];
}

@Injectable()
export class StellarService {
  readonly config: StellarNetworkConfig;
  readonly horizon: Horizon.Server;

  constructor(configService: ConfigService<Env, true>) {
    this.config = getNetworkConfig(
      configService.get('STELLAR_NETWORK', { infer: true }),
      { horizonUrl: configService.get('STELLAR_HORIZON_URL', { infer: true }) },
    );
    this.horizon = new Horizon.Server(this.config.horizonUrl, {
      allowHttp: this.config.horizonUrl.startsWith('http://'),
    });
  }

  get network() {
    return this.config.network;
  }

  get passphrase() {
    return this.config.passphrase;
  }

  toDid(address: string): string {
    return toDidStellar(address, this.network);
  }

  /** Parsea el DID y exige que pertenezca a la red configurada. */
  parseDid(did: string): DidStellar | null {
    const parsed = parseDidStellar(did);
    return parsed?.network === this.network ? parsed : null;
  }

  getAccount(address: string): Promise<StellarAccountState> {
    return getAccountState(address, this.config);
  }

  /** Firmantes de la cuenta según Horizon (Cavos agrega su llave de control). */
  async getFirmantes(address: string): Promise<FirmantesCuenta> {
    const respuesta = await fetch(
      `${this.config.horizonUrl}/accounts/${encodeURIComponent(address)}`,
    );
    if (respuesta.status === 404) return { exists: false, firmantes: [] };
    if (!respuesta.ok) {
      throw new Error(
        `Horizon respondió ${respuesta.status} al consultar la cuenta ${address}`,
      );
    }
    const cuerpo = (await respuesta.json()) as {
      signers?: { key: string; weight: number }[];
    };
    return {
      exists: true,
      firmantes: (cuerpo.signers ?? []).map(({ key, weight }) => ({
        key,
        weight,
      })),
    };
  }
}
