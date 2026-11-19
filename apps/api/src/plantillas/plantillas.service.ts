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
