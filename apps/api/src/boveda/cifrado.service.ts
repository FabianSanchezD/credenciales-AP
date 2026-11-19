import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import type { Env } from '../config/env.js';

const ALGORITMO = 'aes-256-gcm';
const VERSION = 'v1';

/** Cifra el contenido de la bóveda con AES-256-GCM (ADR 0003). */
@Injectable()
export class CifradoService {
  private readonly clave: Buffer;

  constructor(config: ConfigService<Env, true>) {
    const hex = config.get('BOVEDA_CLAVE', { infer: true });
    if (hex) {
      this.clave = Buffer.from(hex, 'hex');
    } else {
      // Solo fuera de producción (env.ts la exige en producción).
      new Logger(CifradoService.name).warn(
        'Sin BOVEDA_CLAVE: se usa una llave fija de desarrollo. No la uses con datos reales.',
      );
      this.clave = createHash('sha256')
        .update('credenciales-ap:boveda:desarrollo')
        .digest();
    }
  }

  /**
   * `contexto` se autentica sin cifrarse (AAD): un texto cifrado para un
   * titular o credencial no se puede mover a otro.
   */
  cifrar(texto: string, contexto: string): string {
    const iv = randomBytes(12);
    const cifrador = createCipheriv(ALGORITMO, this.clave, iv);
    cifrador.setAAD(Buffer.from(contexto, 'utf8'));
    const cifrado = Buffer.concat([
      cifrador.update(texto, 'utf8'),
      cifrador.final(),
    ]);
    const etiqueta = cifrador.getAuthTag();
    return [VERSION, iv, etiqueta, cifrado]
      .map((parte) =>
        typeof parte === 'string' ? parte : parte.toString('base64url'),
      )
      .join('.');
  }

  descifrar(paquete: string, contexto: string): string {
    const [version, iv, etiqueta, cifrado] = paquete.split('.');
    if (version !== VERSION || !iv || !etiqueta || cifrado === undefined) {
      throw new Error('Contenido cifrado con formato desconocido');
    }
    const descifrador = createDecipheriv(
      ALGORITMO,
      this.clave,
      Buffer.from(iv, 'base64url'),
    );
    descifrador.setAAD(Buffer.from(contexto, 'utf8'));
    descifrador.setAuthTag(Buffer.from(etiqueta, 'base64url'));
    return Buffer.concat([
      descifrador.update(Buffer.from(cifrado, 'base64url')),
      descifrador.final(),
    ]).toString('utf8');
  }

  cifrarJson(valor: unknown, contexto: string): string {
    return this.cifrar(JSON.stringify(valor), contexto);
  }

  descifrarJson<T>(paquete: string, contexto: string): T {
    return JSON.parse(this.descifrar(paquete, contexto)) as T;
  }
}
