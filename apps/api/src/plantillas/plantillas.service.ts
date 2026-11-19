import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ContenidoPlantilla } from '@repo/credenciales';
import { randomUUID } from 'node:crypto';
import { EmisoresService } from '../emisores/emisores.service.js';
import type { Plantilla } from './plantilla.entity.js';
import { PlantillasRepository } from './plantillas.repository.js';

/**
 * Plantillas del emisor en sesión. Solo su dueño las crea o cambia: la
 * plataforma nunca edita una plantilla por su cuenta (autonomía del emisor).
 */
@Injectable()
export class PlantillasService {
  constructor(
    private readonly repository: PlantillasRepository,
    private readonly emisores: EmisoresService,
  ) {}

  async listar(address: string): Promise<Plantilla[]> {
    const emisor = await this.emisores.delaCuenta(address);
    return this.repository.findByEmisor(emisor.id);
  }

  async obtener(address: string, id: string): Promise<Plantilla> {
    const emisor = await this.emisores.delaCuenta(address);
    return this.deEmisor(emisor.id, id);
  }

  async deEmisor(emisorId: string, id: string): Promise<Plantilla> {
    const plantilla = await this.repository.findById(emisorId, id);
    if (!plantilla) {
      throw new NotFoundException(`No existe la plantilla ${id}`);
    }
    return plantilla;
  }

  async crear(
    address: string,
    contenido: ContenidoPlantilla,
  ): Promise<Plantilla> {
    const emisor = await this.emisores.delaCuenta(address);
    const ahora = new Date().toISOString();
    return this.repository.save(
      {
        id: randomUUID(),
        emisorId: emisor.id,
        ...contenido,
        version: 1,
        archivada: false,
        carpeta: null,
        etiquetas: [],
        creadaEn: ahora,
        actualizadaEn: ahora,
      },
      address,
    );
  }

  /** Reemplaza el contenido completo y sube la versión. */
  async actualizar(
    address: string,
    id: string,
    contenido: ContenidoPlantilla,
  ): Promise<Plantilla> {
    const plantilla = await this.obtener(address, id);
    if (plantilla.archivada) {
      throw new ConflictException('No se puede editar una plantilla archivada');
    }
    return this.repository.save(
      {
        ...plantilla,
        ...contenido,
        version: plantilla.version + 1,
        actualizadaEn: new Date().toISOString(),
      },
      address,
    );
  }

  /** Carpeta y etiquetas del portal: no tocan el contenido ni la versión. */
  async organizar(
    address: string,
    id: string,
    carpeta: string | null,
    etiquetas: string[],
  ): Promise<Plantilla> {
    const plantilla = await this.obtener(address, id);
    await this.repository.organizar(plantilla.id, carpeta, etiquetas);
    if (carpeta) {
      await this.repository.guardarCarpeta(plantilla.emisorId, carpeta);
    }
    return { ...plantilla, carpeta, etiquetas };
  }

  async restaurar(address: string, id: string): Promise<Plantilla> {
    const plantilla = await this.obtener(address, id);
    if (!plantilla.archivada) return plantilla;
    return this.repository.save(
      {
        ...plantilla,
        archivada: false,
        actualizadaEn: new Date().toISOString(),
      },
      address,
    );
  }

  /** Carpetas guardadas y las que usan sus plantillas, con sus ancestros. */
  async carpetas(address: string): Promise<string[]> {
    const emisor = await this.emisores.delaCuenta(address);
    const rutas = new Set(await this.repository.carpetas(emisor.id));
    for (const p of await this.repository.findByEmisor(emisor.id)) {
      if (p.carpeta) rutas.add(p.carpeta);
    }
    // Copia: el bucle agrega rutas al conjunto que recorre.
    const existentes = Array.from(rutas);
    for (const ruta of existentes) {
      const partes = ruta.split('/');
      for (let i = 1; i < partes.length; i++) {
        rutas.add(partes.slice(0, i).join('/'));
      }
    }
    return [...rutas].sort((a, b) => a.localeCompare(b, 'es'));
  }

  async crearCarpeta(address: string, ruta: string): Promise<string[]> {
    const emisor = await this.emisores.delaCuenta(address);
    if ((await this.carpetas(address)).includes(ruta)) {
      throw new ConflictException('Ya existe una carpeta con ese nombre aquí');
    }
    await this.repository.guardarCarpeta(emisor.id, ruta);
    return this.carpetas(address);
  }

  async renombrarCarpeta(
    address: string,
    de: string,
    a: string,
  ): Promise<string[]> {
    const emisor = await this.emisores.delaCuenta(address);
    const actuales = await this.carpetas(address);
    if (!actuales.includes(de)) {
      throw new NotFoundException(`No existe la carpeta ${de}`);
    }
    if (a !== de && actuales.includes(a)) {
      throw new ConflictException('Ya existe una carpeta con ese nombre aquí');
    }
    // Las carpetas implícitas (solo usadas por plantillas) se guardan antes.
    for (const ruta of actuales) {
      await this.repository.guardarCarpeta(emisor.id, ruta);
    }
    await this.repository.renombrarCarpeta(emisor.id, de, a);
    return this.carpetas(address);
  }

  /** Solo se elimina una carpeta vacía (sin plantillas ni subcarpetas). */
  async eliminarCarpeta(address: string, ruta: string): Promise<string[]> {
    const emisor = await this.emisores.delaCuenta(address);
    const conPlantillas = (await this.repository.findByEmisor(emisor.id)).some(
      (p) => p.carpeta === ruta || p.carpeta?.startsWith(`${ruta}/`),
    );
    const conSubcarpetas = (await this.carpetas(address)).some((r) =>
      r.startsWith(`${ruta}/`),
    );
    if (conPlantillas || conSubcarpetas) {
      throw new ConflictException(
        'Solo se puede eliminar una carpeta vacía. Mueva antes sus plantillas y subcarpetas.',
      );
    }
    await this.repository.eliminarCarpeta(emisor.id, ruta);
    return this.carpetas(address);
  }

  async archivar(address: string, id: string): Promise<Plantilla> {
    const plantilla = await this.obtener(address, id);
    if (plantilla.archivada) return plantilla;
    return this.repository.save(
      {
        ...plantilla,
        archivada: true,
        actualizadaEn: new Date().toISOString(),
      },
      address,
    );
  }
}
