import { Injectable } from '@nestjs/common';
import { BaseDatosService } from '../database/base-datos.service.js';
import type {
  CuentaEmisor,
  DatosInstitucion,
  DatosRepresentante,
} from './cuenta.entity.js';

/** Datos de registro sin lo que ya vive en la tabla `emisores`. */
export interface DatosRegistro {
  emisorId: string;
  institucion: Omit<DatosInstitucion, 'nombre' | 'categoria' | 'sitioWeb'>;
  representante: DatosRepresentante;
  actualizadoEn: string;
}

export abstract class CuentasRepository {
  abstract findByCorreo(correo: string): Promise<CuentaEmisor | null>;
  abstract findByEmisor(emisorId: string): Promise<CuentaEmisor | null>;
  abstract findRegistro(emisorId: string): Promise<DatosRegistro | null>;
  /** Guarda la cuenta y su registro en una sola transacción. */
  abstract crear(
    cuenta: CuentaEmisor,
    registro: DatosRegistro,
    llaveCifrada: string,
  ): Promise<void>;
  abstract findLlave(emisorId: string): Promise<string | null>;
  /** Cambia la contraseña y la llave recifrada con ella, juntas. */
  abstract cambiarContrasena(
    emisorId: string,
    hashContrasena: string,
    llaveCifrada: string | null,
  ): Promise<void>;
  abstract saveRegistro(registro: DatosRegistro): Promise<void>;
}

interface FilaCuenta {
  id: string;
  correo: string;
  hash_contrasena: string;
  emisor_id: string;
  correo_verificado_en: string;
  creada_en: string;
}

interface FilaRegistro {
  emisor_id: string;
  tipo_identificacion: string;
  identificacion: string;
  correo: string;
  provincia: string;
  rep_nombre: string;
  rep_tipo_identificacion: string;
  rep_identificacion: string;
  rep_cargo: string;
  rep_correo: string;
  rep_telefono: string;
  actualizado_en: string;
}

function aCuenta(fila: FilaCuenta): CuentaEmisor {
  return {
    id: fila.id,
    correo: fila.correo,
    hashContrasena: fila.hash_contrasena,
    emisorId: fila.emisor_id,
    correoVerificadoEn: fila.correo_verificado_en,
    creadaEn: fila.creada_en,
  };
}

function aRegistro(fila: FilaRegistro): DatosRegistro {
  return {
    emisorId: fila.emisor_id,
    institucion: {
      tipoIdentificacion:
        fila.tipo_identificacion as DatosInstitucion['tipoIdentificacion'],
      identificacion: fila.identificacion,
      correo: fila.correo,
      provincia: fila.provincia as DatosInstitucion['provincia'],
    },
    representante: {
      nombre: fila.rep_nombre,
      tipoIdentificacion:
        fila.rep_tipo_identificacion as DatosRepresentante['tipoIdentificacion'],
      identificacion: fila.rep_identificacion,
      cargo: fila.rep_cargo,
      correo: fila.rep_correo,
      telefono: fila.rep_telefono,
    },
    actualizadoEn: fila.actualizado_en,
  };
}

@Injectable()
export class SqliteCuentasRepository extends CuentasRepository {
  constructor(private readonly bd: BaseDatosService) {
    super();
  }

  async findByCorreo(correo: string): Promise<CuentaEmisor | null> {
    const fila = this.bd.db
      .prepare('SELECT * FROM cuentas_emisor WHERE correo = ?')
      .get(correo) as FilaCuenta | undefined;
    return fila ? aCuenta(fila) : null;
  }

  async findByEmisor(emisorId: string): Promise<CuentaEmisor | null> {
    const fila = this.bd.db
      .prepare('SELECT * FROM cuentas_emisor WHERE emisor_id = ?')
      .get(emisorId) as FilaCuenta | undefined;
    return fila ? aCuenta(fila) : null;
  }

  async findRegistro(emisorId: string): Promise<DatosRegistro | null> {
    const fila = this.bd.db
      .prepare('SELECT * FROM registros_emisor WHERE emisor_id = ?')
      .get(emisorId) as FilaRegistro | undefined;
    return fila ? aRegistro(fila) : null;
  }

  async findLlave(emisorId: string): Promise<string | null> {
    const fila = this.bd.db
      .prepare('SELECT llave_cifrada FROM llaves_emisor WHERE emisor_id = ?')
      .get(emisorId) as { llave_cifrada: string } | undefined;
    return fila?.llave_cifrada ?? null;
  }

  async crear(
    cuenta: CuentaEmisor,
    registro: DatosRegistro,
    llaveCifrada: string,
  ): Promise<void> {
    this.bd.transaccion(() => {
      this.bd.db
        .prepare(
          'INSERT INTO llaves_emisor (emisor_id, llave_cifrada) VALUES (?, ?)',
        )
        .run(cuenta.emisorId, llaveCifrada);
      this.bd.db
        .prepare(
          `INSERT INTO cuentas_emisor (id, correo, hash_contrasena, emisor_id,
             correo_verificado_en, creada_en)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          cuenta.id,
          cuenta.correo,
          cuenta.hashContrasena,
          cuenta.emisorId,
          cuenta.correoVerificadoEn,
          cuenta.creadaEn,
        );
      this.insertarRegistro(registro);
    });
  }

  async cambiarContrasena(
    emisorId: string,
    hashContrasena: string,
    llaveCifrada: string | null,
  ): Promise<void> {
    this.bd.transaccion(() => {
      this.bd.db
        .prepare(
          'UPDATE cuentas_emisor SET hash_contrasena = ? WHERE emisor_id = ?',
        )
        .run(hashContrasena, emisorId);
      if (llaveCifrada) {
        this.bd.db
          .prepare(
            'UPDATE llaves_emisor SET llave_cifrada = ? WHERE emisor_id = ?',
          )
          .run(llaveCifrada, emisorId);
      }
    });
  }

  async saveRegistro(registro: DatosRegistro): Promise<void> {
    this.insertarRegistro(registro);
  }

  private insertarRegistro(r: DatosRegistro): void {
    this.bd.db
      .prepare(
        `INSERT INTO registros_emisor (emisor_id, tipo_identificacion, identificacion,
           correo, provincia, rep_nombre, rep_tipo_identificacion, rep_identificacion,
           rep_cargo, rep_correo, rep_telefono, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (emisor_id) DO UPDATE SET
           tipo_identificacion = excluded.tipo_identificacion,
           identificacion = excluded.identificacion,
           provincia = excluded.provincia,
           rep_nombre = excluded.rep_nombre,
           rep_tipo_identificacion = excluded.rep_tipo_identificacion,
           rep_identificacion = excluded.rep_identificacion,
           rep_cargo = excluded.rep_cargo,
           rep_correo = excluded.rep_correo,
           rep_telefono = excluded.rep_telefono,
           actualizado_en = excluded.actualizado_en`,
      )
      .run(
        r.emisorId,
        r.institucion.tipoIdentificacion,
        r.institucion.identificacion,
        r.institucion.correo,
        r.institucion.provincia,
        r.representante.nombre,
        r.representante.tipoIdentificacion,
        r.representante.identificacion,
        r.representante.cargo,
        r.representante.correo,
        r.representante.telefono,
        r.actualizadoEn,
      );
  }
}
