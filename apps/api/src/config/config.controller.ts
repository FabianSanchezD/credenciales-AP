import { Controller, Get } from '@nestjs/common';
import type { ConfigPublica } from '@repo/cliente';
import { AnclajeDriver } from '../anclaje/anclaje.driver.js';
import { StellarService } from '../stellar/stellar.service.js';

/** Configuración pública que necesitan las web apps. */
@Controller('config')
export class ConfigController {
  constructor(
    private readonly stellar: StellarService,
    private readonly anclaje: AnclajeDriver,
  ) {}

  @Get()
  obtener(): ConfigPublica {
    return {
      network: this.stellar.network,
      networkPassphrase: this.stellar.passphrase,
      horizonUrl: this.stellar.config.horizonUrl,
      friendbot: Boolean(this.stellar.config.friendbotUrl),
      anclaje: this.anclaje.tipo,
    };
  }
}
