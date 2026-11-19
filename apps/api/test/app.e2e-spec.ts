import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  CredencialEnBoveda,
  Desafio,
  EmisionFirmada,
  EmisionPreparada,
  Emisor,
  Plantilla,
  ResultadoVerificacion,
  ResumenGobernanza,
  RevocacionPreparada,
  Rol,
  Sesion,
} from '@repo/cliente';
import {
  bytesAFirmar,
  codificarPresentacion,
  crearPresentacion,
  firmarSep53ConSemilla,
  type FirmaMensaje,
} from '@repo/credenciales';
import { Keypair } from '@stellar/stellar-sdk';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { StellarService } from './../src/stellar/stellar.service.js';
import { CONTENIDO_PLANTILLA, firmarXdr } from './soporte.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    // Horizon simulado: toda cuenta existe y solo la firma su propia llave.
    const stellar = app.get(StellarService);
    vi.spyOn(stellar, 'getAccount').mockImplementation(async (address) => ({
      address,
      exists: true,
      balanceXlm: '100',
    }));
    vi.spyOn(stellar, 'getFirmantes').mockImplementation(async (address) => ({
      exists: true,
      firmantes: [{ key: address, weight: 1 }],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  async function iniciarSesion(
    llave: Keypair,
    rol: Rol,
    firmar: (mensaje: string) => FirmaMensaje = (mensaje) =>
      firmarSep53ConSemilla(llave.secret(), mensaje),
  ): Promise<Sesion> {
    const { body: desafio } = await api()
      .post('/api/auth/desafios')
      .send({ address: llave.publicKey(), rol })
      .expect(201);
    const { body: sesion } = await api()
      .post('/api/auth/sesiones')
      .send({
        desafioId: (desafio as Desafio).desafioId,
        firma: firmar(desafio.mensaje),
      })
      .expect(201);
    return sesion as Sesion;
  }

  it('GET /api/health y /api/config', async () => {
    await api()
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', stellarNetwork: 'testnet' });
    const { body } = await api().get('/api/config').expect(200);
    expect(body).toMatchObject({
      network: 'testnet',
      friendbot: true,
      anclaje: 'stellar',
    });
  });

  it('exige sesión y rol en las rutas protegidas', async () => {
    await api()
      .post('/api/emisores')
      .send({ nombre: 'Sin sesión', categoria: 'bootcamp', sitioWeb: null })
      .expect(401);
    await api()
      .get('/api/boveda')
      .set('Authorization', 'Bearer inventado')
      .expect(401);

    const titular = await iniciarSesion(Keypair.random(), 'titular');
    await api()
      .get('/api/plantillas')
      .set('Authorization', `Bearer ${titular.token}`)
      .expect(403);
    await api()
      .get('/api/gobernanza/resumen')
      .set('Authorization', `Bearer ${titular.token}`)
      .expect(403);

    await api()
      .delete('/api/auth/sesion')
      .set('Authorization', `Bearer ${titular.token}`)
      .expect(204);
    await api()
      .get('/api/auth/sesion')
      .set('Authorization', `Bearer ${titular.token}`)
      .expect(401);
  });

  it('valida el cuerpo y los parámetros', async () => {
    await api()
      .post('/api/auth/desafios')
      .send({ address: 'GNOVALIDA', rol: 'emisor' })
      .expect(400);
    await api().get('/api/emisores/no-es-uuid').expect(400);
    await api().get('/api/emisores?estado=otro').expect(400);
    await api().get(`/api/emisores/${crypto.randomUUID()}`).expect(404);
    await api().post('/api/verificaciones').send({}).expect(400);
  });

  it('emite, guarda, presenta, verifica y revoca una credencial', async () => {
    const llaveEmisor = Keypair.random();
    const llaveTitular = Keypair.random();
    const llaveGobernanza = Keypair.random();
    const titularDid = `did:stellar:testnet:${llaveTitular.publicKey()}`;

    // 1. El emisor inicia sesión y registra su institución.
    const sesionEmisor = await iniciarSesion(llaveEmisor, 'emisor');
    expect(sesionEmisor.emisor).toBeNull();
    const comoEmisor = { Authorization: `Bearer ${sesionEmisor.token}` };

    const { body: emisor } = await api()
      .post('/api/emisores')
      .set(comoEmisor)
      .send({ nombre: 'Bootcamp Demo', categoria: 'bootcamp', sitioWeb: null })
      .expect(201);
    expect(emisor as Emisor).toMatchObject({
      estado: 'pendiente',
      stellarAddress: llaveEmisor.publicKey(),
    });
    const { body: sesionActual } = await api()
      .get('/api/auth/sesion')
      .set(comoEmisor)
      .expect(200);
    expect(sesionActual.emisor.id).toBe(emisor.id);

    await api()
      .patch(`/api/emisores/${emisor.id}`)
      .set(comoEmisor)
      .send({ sitioWeb: 'https://demo.example' })
      .expect(200);

    // 2. Plantilla: S1 exige resultados de aprendizaje y contexto.
    await api()
      .post('/api/plantillas')
      .set(comoEmisor)
      .send({ ...CONTENIDO_PLANTILLA, resultadosAprendizaje: [] })
      .expect(400);
    const { body: plantilla } = (await api()
      .post('/api/plantillas')
      .set(comoEmisor)
      .send(CONTENIDO_PLANTILLA)
      .expect(201)) as { body: Plantilla };

    // Un emisor pendiente no puede emitir.
    await api()
      .post('/api/emisiones')
      .set(comoEmisor)
      .send({ plantillaId: plantilla.id, titularDid, titularNombre: 'Ana Rojas Mora' })
      .expect(403);

    // 3. La entidad que autoriza habilita al emisor.
    const sesionGobernanza = await iniciarSesion(llaveGobernanza, 'gobernanza');
    const comoGobernanza = {
      Authorization: `Bearer ${sesionGobernanza.token}`,
    };
    await api()
      .post(`/api/emisores/${emisor.id}/estado`)
      .set(comoEmisor)
      .send({ estado: 'autorizado', motivo: 'Me autorizo solo' })
      .expect(403);
    await api()
      .post(`/api/emisores/${emisor.id}/estado`)
      .set(comoGobernanza)
      .send({ estado: 'autorizado', motivo: 'ok' })
      .expect(400);
    const { body: autorizado } = await api()
      .post(`/api/emisores/${emisor.id}/estado`)
      .set(comoGobernanza)
      .send({ estado: 'autorizado', motivo: 'Documentación verificada' })
      .expect(201);
    expect(autorizado).toMatchObject({
      estado: 'autorizado',
      motivoEstado: 'Documentación verificada',
    });
    const { body: autorizados } = await api()
      .get('/api/emisores?estado=autorizado')
      .expect(200);
    expect(autorizados).toHaveLength(1);

    // 4. El emisor inscribe al titular.
    await api()
      .post(`/api/emisores/${emisor.id}/titulares`)
      .set(comoEmisor)
      .send({ did: titularDid })
      .expect(201);

    // 5. Emisión: preparar, firmar la credencial, firmar y enviar la transacción.
    const { body: preparada } = (await api()
      .post('/api/emisiones')
      .set(comoEmisor)
      .send({
        plantillaId: plantilla.id,
        titularDid,
        titularNombre: 'Ana Rojas Mora',
        identificacion: { tipo: 'carne', numero: '2026012345' },
        calificacion: '92/100',
      })
      .expect(201)) as { body: EmisionPreparada };
    expect(preparada.emision.estado).toBe('borrador');

    const { body: firmada } = (await api()
      .post(`/api/emisiones/${preparada.emision.id}/firma`)
      .set(comoEmisor)
      .send({
        firma: firmarSep53ConSemilla(
          llaveEmisor.secret(),
          preparada.mensajeAFirmar,
        ),
      })
      .expect(200)) as { body: EmisionFirmada };
    expect(firmada.emision.estado).toBe('firmada');

    const { body: emitida } = await api()
      .post(`/api/emisiones/${preparada.emision.id}/envio`)
      .set(comoEmisor)
      .send({ signedXdr: firmarXdr(firmada.transaccion.xdr, llaveEmisor) })
      .expect(200);
    expect(emitida).toMatchObject({
      estado: 'emitida',
      hash: firmada.emision.hash,
    });

    // 6. El titular entra con Cavos y ve la credencial en su bóveda.
    const sesionTitular = await iniciarSesion(
      llaveTitular,
      'titular',
      (mensaje) => ({
        esquema: 'cavos',
        publicKey: llaveTitular.publicKey(),
        firma: llaveTitular
          .sign(Buffer.from(bytesAFirmar('cavos', mensaje)))
          .toString('base64'),
      }),
    );
    const comoTitular = { Authorization: `Bearer ${sesionTitular.token}` };
    const { body: boveda } = (await api()
      .get('/api/boveda')
      .set(comoTitular)
      .expect(200)) as { body: CredencialEnBoveda[] };
    expect(boveda).toHaveLength(1);
    expect(boveda[0]).toMatchObject({
      vcId: preparada.emision.id,
      estado: 'valida',
      emisor: { id: emisor.id, nombre: 'Bootcamp Demo' },
    });

    // 7. Presentación selectiva y verificación pública.
    const presentacion = crearPresentacion(
      boveda[0]!.credencial,
      boveda[0]!.divulgaciones,
      ['nombreTitular', 'resultadosAprendizaje', 'calificacion'],
    );
    const { body: resultado } = (await api()
      .post('/api/verificaciones')
      .send({ presentacion })
      .expect(200)) as { body: ResultadoVerificacion };
    expect(resultado.resultado).toBe('valida');
    // La identificación no se eligió: el verificador no la recibe.
    expect(resultado.atributos).toEqual({
      nombreTitular: 'Ana Rojas Mora',
      resultadosAprendizaje: CONTENIDO_PLANTILLA.resultadosAprendizaje,
      calificacion: '92/100',
    });

    const codigo = await codificarPresentacion(presentacion);
    const { body: porCodigo } = await api()
      .post('/api/verificaciones')
      .send({ codigo })
      .expect(200);
    expect(porCodigo.resultado).toBe('valida');

    const alterada = structuredClone(presentacion);
    alterada.credencial.credentialSubject.logro.nombre = 'Maestría en IA';
    const { body: invalida } = await api()
      .post('/api/verificaciones')
      .send({ presentacion: alterada })
      .expect(200);
    expect(invalida.resultado).toBe('invalida');
    expect(invalida.comprobaciones[0]).toMatchObject({
      id: 'firma',
      ok: false,
    });

    // 8. El titular no puede revocar; el emisor sí.
    await api()
      .post(`/api/emisiones/${preparada.emision.id}/revocacion`)
      .set(comoTitular)
      .send({ motivo: 'Quiero revocarla' })
      .expect(403);
    const { body: revocacion } = (await api()
      .post(`/api/emisiones/${preparada.emision.id}/revocacion`)
      .set(comoEmisor)
      .send({ motivo: 'Error en la calificación' })
      .expect(200)) as { body: RevocacionPreparada };
    const { body: revocada } = await api()
      .post(`/api/emisiones/${preparada.emision.id}/revocacion/envio`)
      .set(comoEmisor)
      .send({ signedXdr: firmarXdr(revocacion.transaccion.xdr, llaveEmisor) })
      .expect(200);
    expect(revocada).toMatchObject({
      estado: 'revocada',
      motivoRevocacion: 'Error en la calificación',
    });

    const { body: trasRevocar } = await api()
      .post('/api/verificaciones')
      .send({ presentacion })
      .expect(200);
    expect(trasRevocar.resultado).toBe('revocada');
    const { body: bovedaRevocada } = await api()
      .get('/api/boveda')
      .set(comoTitular)
      .expect(200);
    expect(bovedaRevocada[0].estado).toBe('revocada');

    // 9. RF-02: el titular bloquea al emisor y ya no recibe credenciales.
    await api()
      .put(`/api/boveda/bloqueos/${emisor.id}`)
      .set(comoTitular)
      .expect(204);
    const { body: bloqueos } = await api()
      .get('/api/boveda/bloqueos')
      .set(comoTitular)
      .expect(200);
    expect(bloqueos.map((e: Emisor) => e.id)).toEqual([emisor.id]);
    await api()
      .post('/api/emisiones')
      .set(comoEmisor)
      .send({ plantillaId: plantilla.id, titularDid, titularNombre: 'Ana Rojas Mora' })
      .expect(403);
    await api()
      .delete(`/api/boveda/bloqueos/${emisor.id}`)
      .set(comoTitular)
      .expect(204);

    // 10. Consola de gobernanza.
    const { body: resumen } = (await api()
      .get('/api/gobernanza/resumen')
      .set(comoGobernanza)
      .expect(200)) as { body: ResumenGobernanza };
    expect(resumen).toMatchObject({
      emisores: { pendiente: 0, autorizado: 1, suspendido: 0 },
      credenciales: { emitidas: 1, revocadas: 1 },
      titulares: 1,
      plantillas: 1,
    });
    expect(resumen.indicadores).toHaveLength(5);
    expect(resumen.indicadores.every((i) => i.cumple)).toBe(true);

    const { body: emisiones } = await api()
      .get('/api/emisiones')
      .set(comoEmisor)
      .expect(200);
    expect(emisiones).toHaveLength(1);
  });
});
