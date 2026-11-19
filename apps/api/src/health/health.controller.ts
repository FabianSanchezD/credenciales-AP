import { Controller, Get } from '@nestjs/common';
import { StellarService } from '../stellar/stellar.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly stellar: StellarService) {}

  @Get()
  check() {
    return { status: 'ok', stellarNetwork: this.stellar.network };
  }
}
