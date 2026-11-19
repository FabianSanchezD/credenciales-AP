import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { firmarSep53ConSemilla, verificarPrueba } from '@repo/credenciales';
import { Keypair } from '@stellar/stellar-sdk';
import {
  crearContexto,
  emisorAutorizado,
  firmarXdr,
} from '../../test/soporte.js';

describe('EmisionesService', () => {
  const titular = Keypair.random();
  const titularDid = `did:stellar:testnet:${titular.publicKey()}`;

  async function setup() {
    const ctx = crearContexto();
    return { ctx, ...(await emisorAutorizado(ctx)) };
  }

  it('recorre borrador -> firmada -> emitida y guarda la credencial en la bóveda', async () => {
    const { ctx, llave, plantilla } = await setup();
    const cuenta = llave.publicKey();

    const preparada = await ctx.emisiones.preparar(cuenta, {
      plantillaId: plantilla.id,
      titularDid,
      calificacion: '95/100',
    });
    expect(preparada.emision).toMatchObject({
      estado: 'borrador',
      titularDid,
      plantillaNombre: plantilla.nombre,
      hash: null,
    });
    expect(preparada.mensajeAFirmar).toContain(titularDid);
    // La calificación va oculta en una divulgación, no en claro.
    expect(preparada.mensajeAFirmar).not.toContain('95/100');

    const firmada = await ctx.emisiones.firmar(
      cuenta,
      preparada.emision.id,
      firmarSep53ConSemilla(llave.secret(), preparada.mensajeAFirmar),
    );
    expect(firmada.emision.estado).toBe('firmada');
    expect(firmada.emision.hash).toMatch(/^[0-9a-f]{64}$/);

    const emitida = await ctx.emisiones.enviar(
      cuenta,
      preparada.emision.id,
      firmarXdr(firmada.transaccion.xdr, llave),
    );
    expect(emitida).toMatchObject({ estado: 'emitida' });
    expect(emitida.txHash).toBeTruthy();
    expect(emitida.emitidaEn).toBeTruthy();

    const boveda = await ctx.boveda.listar(titular.publicKey());
    expect(boveda).toHaveLength(1);
    expect(boveda[0]).toMatchObject({ vcId: emitida.id, estado: 'valida' });
    expect(verificarPrueba(boveda[0]!.credencial)).toBe(true);
    expect(boveda[0]!.divulgaciones.map(([, nombre]) => nombre)).toContain(
      'calificacion',
    );
  });

  it('exige un emisor autorizado', async () => {
    const ctx = crearContexto();
    const llave = Keypair.random();
    await ctx.emisores.create(llave.publicKey(), {
      nombre: 'Pendiente',
      categoria: 'bootcamp',
    });
    const plantilla = await ctx.plantillas.crear(llave.publicKey(), {
      nombre: 'Curso',
      descripcion: 'Curso',
      resultadosAprendizaje: ['Algo'],
      temasEvaluados: [],
      contexto: {
        horas: 1,
        nivel: 'basico',
        modalidad: 'virtual',
        tipoAprendizaje: 'formal',
      },
      vigenciaMeses: null,
    });

    await expect(
      ctx.emisiones.preparar(llave.publicKey(), {
        plantillaId: plantilla.id,
        titularDid,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza un DID de otra red, una plantilla archivada y un titular que bloqueó al emisor', async () => {
    const { ctx, llave, emisor, plantilla } = await setup();
    const cuenta = llave.publicKey();

    await expect(
      ctx.emisiones.preparar(cuenta, {
        plantillaId: plantilla.id,
        titularDid: `did:stellar:mainnet:${titular.publicKey()}`,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await ctx.boveda.bloquear(titular.publicKey(), emisor.id);
    await expect(
      ctx.emisiones.preparar(cuenta, { plantillaId: plantilla.id, titularDid }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await ctx.boveda.desbloquear(titular.publicKey(), emisor.id);

    await ctx.plantillas.archivar(cuenta, plantilla.id);
    await expect(
      ctx.emisiones.preparar(cuenta, { plantillaId: plantilla.id, titularDid }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza firmas de otra cuenta o sobre otro mensaje', async () => {
    const { ctx, llave, plantilla } = await setup();
    const cuenta = llave.publicKey();
    const { emision, mensajeAFirmar } = await ctx.emisiones.preparar(cuenta, {
      plantillaId: plantilla.id,
      titularDid,
    });

    await expect(
      ctx.emisiones.firmar(
        cuenta,
        emision.id,
        firmarSep53ConSemilla(Keypair.random().secret(), mensajeAFirmar),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      ctx.emisiones.firmar(
        cuenta,
        emision.id,
        firmarSep53ConSemilla(llave.secret(), `${mensajeAFirmar} `),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('solo acepta la transacción preparada y firmada por el emisor', async () => {
    const { ctx, llave, plantilla } = await setup();
    const cuenta = llave.publicKey();
    const { emision, mensajeAFirmar } = await ctx.emisiones.preparar(cuenta, {
      plantillaId: plantilla.id,
      titularDid,
    });

    await expect(
      ctx.emisiones.enviar(cuenta, emision.id, 'AAAA'),
    ).rejects.toBeInstanceOf(ConflictException);

    const { transaccion } = await ctx.emisiones.firmar(
      cuenta,
      emision.id,
      firmarSep53ConSemilla(llave.secret(), mensajeAFirmar),
    );
    // Sin firma.
    await expect(
      ctx.emisiones.enviar(cuenta, emision.id, transaccion.xdr),
    ).rejects.toBeInstanceOf(BadRequestException);
    // Firmada por otra cuenta.
    await expect(
      ctx.emisiones.enviar(
        cuenta,
        emision.id,
        firmarXdr(transaccion.xdr, Keypair.random()),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    // Otra transacción (la de otra emisión).
    const otra = await ctx.emisiones.preparar(cuenta, {
      plantillaId: plantilla.id,
      titularDid,
    });
    const otraFirmada = await ctx.emisiones.firmar(
      cuenta,
      otra.emision.id,
      firmarSep53ConSemilla(llave.secret(), otra.mensajeAFirmar),
    );
    await expect(
      ctx.emisiones.enviar(
        cuenta,
        emision.id,
        firmarXdr(otraFirmada.transaccion.xdr, llave),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revoca solo credenciales emitidas y marca la bóveda', async () => {
    const { ctx, llave, plantilla } = await setup();
    const cuenta = llave.publicKey();
    const { emision, mensajeAFirmar } = await ctx.emisiones.preparar(cuenta, {
      plantillaId: plantilla.id,
      titularDid,
    });

    await expect(
      ctx.emisiones.prepararRevocacion(cuenta, emision.id, 'Error en la nota'),
    ).rejects.toBeInstanceOf(ConflictException);

    const { transaccion } = await ctx.emisiones.firmar(
      cuenta,
      emision.id,
      firmarSep53ConSemilla(llave.secret(), mensajeAFirmar),
    );
    await ctx.emisiones.enviar(
      cuenta,
      emision.id,
      firmarXdr(transaccion.xdr, llave),
    );

    await expect(
      ctx.emisiones.enviarRevocacion(cuenta, emision.id, 'AAAA'),
    ).rejects.toBeInstanceOf(ConflictException);

    const revocacion = await ctx.emisiones.prepararRevocacion(
      cuenta,
      emision.id,
      'Error en la nota',
    );
    const revocada = await ctx.emisiones.enviarRevocacion(
      cuenta,
      emision.id,
      firmarXdr(revocacion.transaccion.xdr, llave),
    );
    expect(revocada).toMatchObject({
      estado: 'revocada',
      motivoRevocacion: 'Error en la nota',
    });
    expect(revocada.revocadaEn).toBeTruthy();
    expect(revocada.txRevocacion).toBeTruthy();

    const [enBoveda] = await ctx.boveda.listar(titular.publicKey());
    expect(enBoveda).toMatchObject({
      estado: 'revocada',
      revocadaEn: revocada.revocadaEn,
      motivoRevocacion: 'Error en la nota',
    });

    await expect(
      ctx.emisiones.prepararRevocacion(cuenta, emision.id, 'Otra vez'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('otro emisor no ve ni revoca emisiones ajenas', async () => {
    const { ctx, llave, plantilla } = await setup();
    const { emision } = await ctx.emisiones.preparar(llave.publicKey(), {
      plantillaId: plantilla.id,
      titularDid,
    });
    const otro = await emisorAutorizado(ctx);

    await expect(
      ctx.emisiones.obtener(otro.llave.publicKey(), emision.id),
    ).rejects.toThrow(/No existe/);
    await expect(ctx.emisiones.listar(otro.llave.publicKey())).resolves.toEqual(
      [],
    );
  });
});
