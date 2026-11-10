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
import type { Env } from '../config/env.js';

@Injectable()
export class StellarService {
  readonly config: StellarNetworkConfig;

  constructor(configService: ConfigService<Env, true>) {
    this.config = getNetworkConfig(
      configService.get('STELLAR_NETWORK', { infer: true }),
      { horizonUrl: configService.get('STELLAR_HORIZON_URL', { infer: true }) },
    );
  }

  get network() {
    return this.config.network;
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
}
