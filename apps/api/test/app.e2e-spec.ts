import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Keypair } from '@stellar/stellar-sdk';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { StellarService } from './../src/stellar/stellar.service.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    // Evita llamar a Horizon: toda cuenta de emisor "existe" on-chain.
    vi.spyOn(app.get(StellarService), 'getAccount').mockImplementation(
      async (address) => ({ address, exists: true, balanceXlm: '100' }),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', stellarNetwork: 'testnet' });
  });

  it('crea un emisor e inscribe titulares', async () => {
    const server = app.getHttpServer();

    const { body: emisor } = await request(server)
      .post('/api/emisores')
      .send({
        nombre: 'Tecnológico de Costa Rica',
        categoria: 'universidad',
        stellarAddress: Keypair.random().publicKey(),
      })
      .expect(201);
    expect(emisor.estado).toBe('pendiente');

    const did = `did:stellar:testnet:${Keypair.random().publicKey()}`;
    await request(server)
      .post(`/api/emisores/${emisor.id}/titulares`)
      .send({ did })
      .expect(201);

    const { body: titulares } = await request(server)
      .get(`/api/emisores/${emisor.id}/titulares`)
      .expect(200);
    expect(titulares).toHaveLength(1);
    expect(titulares[0].did).toBe(did);
  });

  it('valida el cuerpo y los parámetros', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/api/emisores')
      .send({ nombre: 'X', categoria: 'otra', stellarAddress: 'GNOVALIDA' })
      .expect(400);
    await request(server).get('/api/emisores/no-es-uuid').expect(400);
    await request(server)
      .get(`/api/emisores/${crypto.randomUUID()}/titulares`)
      .expect(404);
  });
});
