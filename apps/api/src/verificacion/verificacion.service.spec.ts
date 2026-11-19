import { BadRequestException } from '@nestjs/common';
import type { ContenidoPlantilla } from '@repo/credenciales';
import {
  adjuntarPrueba,
  codificarPresentacion,
  construirCredencial,
  crearPresentacion,
  estadoStellar,
  firmarSep53ConSemilla,
  mensajeDeFirma,
  type CredencialFirmada,
  type Divulgacion,
  type Presentacion,
} from '@repo/credenciales';
import { Keypair } from '@stellar/stellar-sdk';
import {
  CONTENIDO_PLANTILLA,
  crearContexto,
  emisorAutorizado,
  firmarXdr,
} from '../../test/soporte.js';

const titular = Keypair.random();
const titularDid = `did:stellar:testnet:${titular.publicKey()}`;

async function emitir(contenido: Partial<ContenidoPlantilla> = {}) {
  const ctx = crearContexto();
  const { llave, emisor, plantilla: base } = await emisorAutorizado(ctx);
  const cuenta = llave.publicKey();
  const plantilla = await ctx.plantillas.actualizar(cuenta, base.id, {
    ...CONTENIDO_PLANTILLA,
    ...contenido,
  });
  const { emision, mensajeAFirmar } = await ctx.emisiones.preparar(cuenta, {
    plantillaId: plantilla.id,
    titularDid,
    titularNombre: 'Ana Rojas Mora',
    identificacion: { tipo: 'cedula', numero: '1-1234-0567' },
    calificacion: 'Aprobado',
  });
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
  const [enBoveda] = await ctx.boveda.listar(titular.publicKey());
  return {
    ctx,
    llave,
    emisor,
    emisionId: emision.id,
    credencial: enBoveda!.credencial,
    divulgaciones: enBoveda!.divulgaciones,
  };
}

function presentar(
  credencial: CredencialFirmada,
  divulgaciones: Divulgacion[],
): Presentacion {
  return crearPresentacion(credencial, divulgaciones, [
    'resultadosAprendizaje',
    'contexto',
  ]);
}

function porId(resultado: {
  comprobaciones: { id: string; ok: boolean; detalle: string }[];
}) {
  return Object.fromEntries(resultado.comprobaciones.map((c) => [c.id, c]));
}

describe('VerificacionService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('una credencial auténtica es válida y solo muestra lo revelado', async () => {
    const { ctx, credencial, divulgaciones, emisor } = await emitir();

    const resultado = await ctx.verificacion.verificar({
      presentacion: presentar(credencial, divulgaciones),
    });

    expect(resultado.resultado).toBe('valida');
    expect(resultado.comprobaciones.map((c) => c.id)).toEqual([
      'firma',
      'integridad',
      'estado',
      'emisor',
    ]);
    expect(resultado.comprobaciones.every((c) => c.ok)).toBe(true);
    expect(resultado.emisor).toMatchObject({
      id: emisor.id,
      nombre: emisor.nombre,
    });
    expect(resultado.titularDid).toBe(titularDid);
    expect(resultado.atributos).toEqual({
      resultadosAprendizaje: CONTENIDO_PLANTILLA.resultadosAprendizaje,
      contexto: CONTENIDO_PLANTILLA.contexto,
    });
    expect(resultado.atributos).not.toHaveProperty('calificacion');
    expect(resultado.duracionMs).toBeGreaterThanOrEqual(0);
  });

  it('acepta el código comprimido del QR', async () => {
    const { ctx, credencial, divulgaciones } = await emitir();
    const codigo = await codificarPresentacion(
      presentar(credencial, divulgaciones),
    );

    await expect(ctx.verificacion.verificar({ codigo })).resolves.toMatchObject(
      {
        resultado: 'valida',
      },
    );
    await expect(
      ctx.verificacion.verificar({ codigo: 'no-es-un-codigo' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('una credencial alterada es inválida por la firma', async () => {
    const { ctx, credencial, divulgaciones } = await emitir();
    const alterada: CredencialFirmada = {
      ...credencial,
      credentialSubject: {
        ...credencial.credentialSubject,
        logro: {
          ...credencial.credentialSubject.logro,
          nombre: 'Doctorado en Física',
        },
      },
    };

    const resultado = await ctx.verificacion.verificar({
      presentacion: presentar(alterada, divulgaciones),
    });

    expect(resultado.resultado).toBe('invalida');
    const c = porId(resultado);
    expect(c.firma!.ok).toBe(false);
    expect(c.integridad!.ok).toBe(false);
  });

  it('una divulgación alterada es inválida por integridad', async () => {
    const { ctx, credencial, divulgaciones } = await emitir();
    const alteradas = divulgaciones.map((d): Divulgacion =>
      d[1] === 'contexto'
        ? [d[0], d[1], { ...CONTENIDO_PLANTILLA.contexto, horas: 400 }]
        : d,
    );

    const resultado = await ctx.verificacion.verificar({
      presentacion: presentar(credencial, alteradas),
    });

    expect(resultado.resultado).toBe('invalida');
    const c = porId(resultado);
    expect(c.firma!.ok).toBe(true);
    expect(c.integridad!.ok).toBe(false);
    expect(c.integridad!.detalle).toMatch(/datos revelados/);
    expect(resultado.atributos).toEqual({});
  });

  it('una credencial revocada da resultado revocada', async () => {
    const { ctx, llave, emisionId, credencial, divulgaciones } = await emitir();
    const { transaccion } = await ctx.emisiones.prepararRevocacion(
      llave.publicKey(),
      emisionId,
      'Se detectó un error',
    );
    await ctx.emisiones.enviarRevocacion(
      llave.publicKey(),
      emisionId,
      firmarXdr(transaccion.xdr, llave),
    );

    const resultado = await ctx.verificacion.verificar({
      presentacion: presentar(credencial, divulgaciones),
    });

    expect(resultado.resultado).toBe('revocada');
    expect(resultado.revocadaEn).toBeTruthy();
    const c = porId(resultado);
    expect(c.estado!.ok).toBe(false);
    expect(c.firma!.ok && c.integridad!.ok && c.emisor!.ok).toBe(true);
  });

  it('una credencial vencida es inválida', async () => {
    const { ctx, credencial, divulgaciones } = await emitir({
      vigenciaMeses: 1,
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 40 * 24 * 60 * 60 * 1000);

    const resultado = await ctx.verificacion.verificar({
      presentacion: presentar(credencial, divulgaciones),
    });

    expect(resultado.resultado).toBe('invalida');
    expect(porId(resultado).estado!.detalle).toMatch(/vencida/);
  });

  it('un emisor suspendido después de emitir no invalida la credencial', async () => {
    const { ctx, emisor, credencial, divulgaciones } = await emitir();
    await ctx.emisores.cambiarEstado(emisor.id, {
      estado: 'suspendido',
      motivo: 'Revisión',
    });

    const resultado = await ctx.verificacion.verificar({
      presentacion: presentar(credencial, divulgaciones),
    });
    expect(resultado.resultado).toBe('valida');
    expect(porId(resultado).emisor!.detalle).toMatch(/suspendida/);
  });

  it('un emisor fuera del registro y sin anclaje es inválido', async () => {
    const ctx = crearContexto();
    const ajeno = Keypair.random();
    const vcId = crypto.randomUUID();
    const { credencial, divulgaciones } = construirCredencial({
      vcId,
      emisor: {
        did: `did:stellar:testnet:${ajeno.publicKey()}`,
        nombre: 'Falsa U',
      },
      titularDid,
      logro: { nombre: 'Título falso', descripcion: 'No existe' },
      atributos: {
        resultadosAprendizaje: ['Nada'],
        temasEvaluados: [],
        contexto: CONTENIDO_PLANTILLA.contexto,
      },
      emitidaEn: new Date(),
      vigenciaMeses: null,
      estado: estadoStellar('testnet', ajeno.publicKey(), vcId),
    });
    const firmada = adjuntarPrueba(
      credencial,
      firmarSep53ConSemilla(ajeno.secret(), mensajeDeFirma(credencial)),
    );

    const resultado = await ctx.verificacion.verificar({
      presentacion: presentar(firmada, divulgaciones),
    });

    expect(resultado.resultado).toBe('invalida');
    const c = porId(resultado);
    expect(c.firma!.ok).toBe(true);
    expect(c.integridad!.ok).toBe(false);
    expect(c.emisor!.ok).toBe(false);
    expect(resultado.emisor).toBeNull();
    expect(resultado.emisorDeclarado.nombre).toBe('Falsa U');
  });
});
