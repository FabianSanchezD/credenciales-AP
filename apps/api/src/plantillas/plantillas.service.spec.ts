import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';
import { CONTENIDO_PLANTILLA, crearContexto } from '../../test/soporte.js';
import { plantillaSchema } from './plantillas.schemas.js';

describe('Plantillas', () => {
  describe('validación S1', () => {
    it('acepta una plantilla completa', () => {
      expect(plantillaSchema.safeParse(CONTENIDO_PLANTILLA).success).toBe(true);
    });

    it('rechaza una plantilla sin resultados de aprendizaje', () => {
      const resultado = plantillaSchema.safeParse({
        ...CONTENIDO_PLANTILLA,
        resultadosAprendizaje: [],
      });
      expect(resultado.success).toBe(false);
    });

    it('rechaza una plantilla sin contexto formativo', () => {
      const sinContexto: Record<string, unknown> = { ...CONTENIDO_PLANTILLA };
      delete sinContexto.contexto;
      expect(plantillaSchema.safeParse(sinContexto).success).toBe(false);
      expect(
        plantillaSchema.safeParse({
          ...CONTENIDO_PLANTILLA,
          contexto: { ...CONTENIDO_PLANTILLA.contexto, horas: 0 },
        }).success,
      ).toBe(false);
    });

    it('no acredita aprendizaje informal', () => {
      expect(
        plantillaSchema.safeParse({
          ...CONTENIDO_PLANTILLA,
          contexto: {
            ...CONTENIDO_PLANTILLA.contexto,
            tipoAprendizaje: 'informal',
          },
        }).success,
      ).toBe(false);
    });
  });

  describe('PlantillasService', () => {
    async function setup() {
      const ctx = crearContexto();
      const llave = Keypair.random();
      const emisor = await ctx.emisores.create(llave.publicKey(), {
        nombre: 'Universidad Demo',
        categoria: 'universidad',
      });
      return { ...ctx, cuenta: llave.publicKey(), emisor };
    }

    it('crea una plantilla en versión 1', async () => {
      const { plantillas, cuenta, emisor } = await setup();
      const plantilla = await plantillas.crear(cuenta, CONTENIDO_PLANTILLA);
      expect(plantilla).toMatchObject({
        ...CONTENIDO_PLANTILLA,
        emisorId: emisor.id,
        version: 1,
        archivada: false,
      });
      await expect(plantillas.listar(cuenta)).resolves.toHaveLength(1);
    });

    it('PUT reemplaza el contenido y sube la versión', async () => {
      const { plantillas, cuenta } = await setup();
      const plantilla = await plantillas.crear(cuenta, CONTENIDO_PLANTILLA);

      const nueva = await plantillas.actualizar(cuenta, plantilla.id, {
        ...CONTENIDO_PLANTILLA,
        nombre: 'Desarrollo web avanzado',
        temasEvaluados: [],
      });
      expect(nueva).toMatchObject({
        id: plantilla.id,
        nombre: 'Desarrollo web avanzado',
        temasEvaluados: [],
        version: 2,
      });
    });

    it('archiva y no permite editar una plantilla archivada', async () => {
      const { plantillas, cuenta } = await setup();
      const plantilla = await plantillas.crear(cuenta, CONTENIDO_PLANTILLA);

      await expect(
        plantillas.archivar(cuenta, plantilla.id),
      ).resolves.toMatchObject({
        archivada: true,
      });
      await expect(
        plantillas.actualizar(cuenta, plantilla.id, CONTENIDO_PLANTILLA),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('organiza en carpetas y etiquetas sin cambiar la versión', async () => {
      const { plantillas, cuenta } = await setup();
      const p = await plantillas.crear(cuenta, CONTENIDO_PLANTILLA);
      const organizada = await plantillas.organizar(
        cuenta,
        p.id,
        'Grado/Ingenierías',
        ['acreditada'],
      );
      expect(organizada).toMatchObject({
        version: 1,
        carpeta: 'Grado/Ingenierías',
      });
      await expect(plantillas.carpetas(cuenta)).resolves.toEqual([
        'Grado',
        'Grado/Ingenierías',
      ]);
      await expect(
        plantillas.eliminarCarpeta(cuenta, 'Grado'),
      ).rejects.toBeInstanceOf(ConflictException);

      await plantillas.renombrarCarpeta(cuenta, 'Grado', 'Títulos');
      await expect(plantillas.obtener(cuenta, p.id)).resolves.toMatchObject({
        carpeta: 'Títulos/Ingenierías',
        etiquetas: ['acreditada'],
      });

      await plantillas.crearCarpeta(cuenta, 'Vacía');
      await expect(
        plantillas.eliminarCarpeta(cuenta, 'Vacía'),
      ).resolves.not.toContain('Vacía');
    });

    it('restaura una plantilla archivada', async () => {
      const { plantillas, cuenta } = await setup();
      const p = await plantillas.crear(cuenta, CONTENIDO_PLANTILLA);
      await plantillas.archivar(cuenta, p.id);
      await expect(plantillas.restaurar(cuenta, p.id)).resolves.toMatchObject({
        archivada: false,
      });
    });

    it('cada emisor solo ve sus plantillas', async () => {
      const { plantillas, emisores, cuenta } = await setup();
      const plantilla = await plantillas.crear(cuenta, CONTENIDO_PLANTILLA);
      const otra = Keypair.random().publicKey();
      await emisores.create(otra, {
        nombre: 'Otra institución',
        categoria: 'bootcamp',
      });

      await expect(
        plantillas.obtener(otra, plantilla.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(plantillas.listar(otra)).resolves.toEqual([]);
    });

    it('exige un emisor registrado', async () => {
      const { plantillas } = await setup();
      await expect(
        plantillas.crear(Keypair.random().publicKey(), CONTENIDO_PLANTILLA),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
