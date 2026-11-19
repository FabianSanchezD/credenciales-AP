import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  bytesAFirmar,
  firmarSep53ConSemilla,
  type FirmaMensaje,
} from '@repo/credenciales';
import { Keypair } from '@stellar/stellar-sdk';
import { crearContexto, stellarPrueba } from '../../test/soporte.js';
import type { FirmantesCuenta } from '../stellar/stellar.service.js';

function firmarCavos(llave: Keypair, mensaje: string): FirmaMensaje {
  return {
    esquema: 'cavos',
    publicKey: llave.publicKey(),
    firma: llave
      .sign(Buffer.from(bytesAFirmar('cavos', mensaje)))
      .toString('base64'),
  };
}

describe('AuthService', () => {
  it('inicia sesión de emisor con una firma SEP-53 de la misma cuenta', async () => {
    const { auth, emisores } = crearContexto();
    const llave = Keypair.random();
    await emisores.create(llave.publicKey(), {
      nombre: 'Universidad Demo',
      categoria: 'universidad',
    });

    const desafio = await auth.crearDesafio({
      address: llave.publicKey(),
      rol: 'emisor',
    });
    expect(desafio.mensaje).toContain('Credenciales AP');
    expect(desafio.mensaje).toContain(llave.publicKey());
    expect(desafio.mensaje).toContain('emisor');

    const sesion = await auth.crearSesion({
      desafioId: desafio.desafioId,
      firma: firmarSep53ConSemilla(llave.secret(), desafio.mensaje),
    });
    expect(sesion).toMatchObject({
      rol: 'emisor',
      address: llave.publicKey(),
      did: `did:stellar:testnet:${llave.publicKey()}`,
      emisor: { stellarAddress: llave.publicKey() },
    });
    expect(Buffer.from(sesion.token, 'base64url')).toHaveLength(32);

    const activa = await auth.sesionPorToken(sesion.token);
    expect(activa?.address).toBe(llave.publicKey());
    await auth.cerrarSesion(sesion.token);
    await expect(auth.sesionPorToken(sesion.token)).resolves.toBeNull();
  });

  it('cada desafío se usa una sola vez', async () => {
    const { auth } = crearContexto();
    const llave = Keypair.random();
    const desafio = await auth.crearDesafio({
      address: llave.publicKey(),
      rol: 'titular',
    });
    const firma = firmarSep53ConSemilla(llave.secret(), desafio.mensaje);

    await auth.crearSesion({ desafioId: desafio.desafioId, firma });
    await expect(
      auth.crearSesion({ desafioId: desafio.desafioId, firma }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza una firma SEP-53 de otra cuenta', async () => {
    const { auth } = crearContexto();
    const cuenta = Keypair.random();
    const otra = Keypair.random();
    const desafio = await auth.crearDesafio({
      address: cuenta.publicKey(),
      rol: 'emisor',
    });

    await expect(
      auth.crearSesion({
        desafioId: desafio.desafioId,
        firma: firmarSep53ConSemilla(otra.secret(), desafio.mensaje),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza una firma sobre otro mensaje', async () => {
    const { auth } = crearContexto();
    const llave = Keypair.random();
    const desafio = await auth.crearDesafio({
      address: llave.publicKey(),
      rol: 'titular',
    });

    await expect(
      auth.crearSesion({
        desafioId: desafio.desafioId,
        firma: firmarSep53ConSemilla(llave.secret(), 'otro mensaje'),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe('esquema cavos', () => {
    const titular = Keypair.random();
    const control = Keypair.random();

    function contexto(firmantes: FirmantesCuenta) {
      return crearContexto({
        stellar: stellarPrueba({ firmantes: () => firmantes }),
      });
    }

    async function iniciar(
      ctx: ReturnType<typeof crearContexto>,
      llave: Keypair,
      rol: 'titular' | 'emisor' = 'titular',
    ) {
      const desafio = await ctx.auth.crearDesafio({
        address: titular.publicKey(),
        rol,
      });
      return ctx.auth.crearSesion({
        desafioId: desafio.desafioId,
        firma: firmarCavos(llave, desafio.mensaje),
      });
    }

    it('acepta la llave de la propia cuenta', async () => {
      const ctx = contexto({ exists: true, firmantes: [] });
      await expect(iniciar(ctx, titular)).resolves.toMatchObject({
        rol: 'titular',
      });
    });

    it('acepta la llave de control si es firmante con peso', async () => {
      const ctx = contexto({
        exists: true,
        firmantes: [
          { key: titular.publicKey(), weight: 0 },
          { key: control.publicKey(), weight: 1 },
        ],
      });
      await expect(iniciar(ctx, control)).resolves.toMatchObject({
        address: titular.publicKey(),
      });
    });

    it('rechaza una llave sin peso o que no es firmante', async () => {
      const sinPeso = contexto({
        exists: true,
        firmantes: [{ key: control.publicKey(), weight: 0 }],
      });
      await expect(iniciar(sinPeso, control)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      const ajena = contexto({
        exists: true,
        firmantes: [{ key: titular.publicKey(), weight: 1 }],
      });
      await expect(iniciar(ajena, control)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('acepta la llave de control si la cuenta aún no existe (ADR 0002)', async () => {
      const ctx = contexto({ exists: false, firmantes: [] });
      await expect(iniciar(ctx, control)).resolves.toMatchObject({
        rol: 'titular',
      });
    });

    it('solo está disponible para titulares', async () => {
      const ctx = contexto({ exists: true, firmantes: [] });
      await expect(iniciar(ctx, titular, 'emisor')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('gobernanza', () => {
    it('solo admite cuentas de GOBERNANZA_CUENTAS', async () => {
      const autorizada = Keypair.random();
      const { auth } = crearContexto({
        config: { GOBERNANZA_CUENTAS: [autorizada.publicKey()] },
      });

      await expect(
        auth.crearDesafio({
          address: Keypair.random().publicKey(),
          rol: 'gobernanza',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      const desafio = await auth.crearDesafio({
        address: autorizada.publicKey(),
        rol: 'gobernanza',
      });
      await expect(
        auth.crearSesion({
          desafioId: desafio.desafioId,
          firma: firmarSep53ConSemilla(autorizada.secret(), desafio.mensaje),
        }),
      ).resolves.toMatchObject({ rol: 'gobernanza', emisor: null });
    });

    it('GOBERNANZA_ABIERTA admite cualquier cuenta', async () => {
      const { auth } = crearContexto({ config: { GOBERNANZA_ABIERTA: true } });
      await expect(
        auth.crearDesafio({
          address: Keypair.random().publicKey(),
          rol: 'gobernanza',
        }),
      ).resolves.toHaveProperty('desafioId');
    });
  });
});
