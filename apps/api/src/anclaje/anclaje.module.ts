import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { StellarService } from '../stellar/stellar.service.js';
import { ActaAnclajeDriver, type ClienteActa } from './acta.driver.js';
import { AnclajeDriver } from './anclaje.driver.js';
import { MemoriaAnclajeDriver } from './memoria.driver.js';
import { StellarAnclajeDriver } from './stellar.driver.js';

/** Elige el driver con `ANCLAJE_DRIVER` (ADR 0001). */
@Global()
@Module({
  providers: [
    {
      provide: AnclajeDriver,
      inject: [ConfigService, StellarService],
      useFactory: async (
        config: ConfigService<Env, true>,
        stellar: StellarService,
      ): Promise<AnclajeDriver> => {
        switch (config.get('ANCLAJE_DRIVER', { infer: true })) {
          case 'memoria':
            return new MemoriaAnclajeDriver(
              stellar.network,
              stellar.passphrase,
            );
          case 'acta': {
            // Import diferido: el SDK de ACTA solo se carga si se usa.
            const { ActaClient, testNet, mainNet } =
              await import('@acta-team/credentials');
            const url =
              config.get('ACTA_API_URL', { infer: true }) ??
              (stellar.network === 'mainnet' ? mainNet : testNet);
            const cliente: ClienteActa = new ActaClient(
              url,
              config.get('ACTA_API_KEY', { infer: true }),
            );
            return new ActaAnclajeDriver(
              cliente,
              stellar.network,
              stellar.passphrase,
            );
          }
          default:
            return new StellarAnclajeDriver(stellar);
        }
      },
    },
  ],
  exports: [AnclajeDriver],
})
export class AnclajeModule {}
