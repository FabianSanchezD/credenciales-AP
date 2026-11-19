/**
 * Esquema SQLite. Guarda datos institucionales, DIDs y metadatos de emisión:
 * ningún nombre, cédula ni correo de titulares (RNF-01, Tabla 7).
 *
 * Excepción: `registros_emisor` guarda los datos de contacto del
 * representante legal de cada institución, que pide el registro de cuentas.
 * Solo los consultan la institución y la entidad que autoriza.
 */
export const ESQUEMA_SQL = `
CREATE TABLE IF NOT EXISTS emisores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  sitio_web TEXT,
  stellar_address TEXT NOT NULL UNIQUE,
  did TEXT NOT NULL,
  estado TEXT NOT NULL,
  motivo_estado TEXT,
  autorizado_en TEXT,
  suspendido_en TEXT,
  creado_en TEXT NOT NULL,
  actualizado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS titulares (
  id TEXT PRIMARY KEY,
  emisor_id TEXT NOT NULL REFERENCES emisores(id),
  did TEXT NOT NULL,
  stellar_address TEXT NOT NULL,
  registrado_en TEXT NOT NULL,
  UNIQUE (emisor_id, did)
);

CREATE TABLE IF NOT EXISTS plantillas (
  id TEXT PRIMARY KEY,
  emisor_id TEXT NOT NULL REFERENCES emisores(id),
  contenido TEXT NOT NULL,
  version INTEGER NOT NULL,
  archivada INTEGER NOT NULL DEFAULT 0,
  modificada_por TEXT NOT NULL,
  creada_en TEXT NOT NULL,
  actualizada_en TEXT NOT NULL
);

-- Organización del portal (carpetas y etiquetas). No forma parte de la
-- plantilla ni de las credenciales, así que no cambia su versión.
CREATE TABLE IF NOT EXISTS organizacion_plantillas (
  plantilla_id TEXT PRIMARY KEY REFERENCES plantillas(id),
  carpeta TEXT,
  etiquetas TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS carpetas_plantillas (
  emisor_id TEXT NOT NULL REFERENCES emisores(id),
  ruta TEXT NOT NULL,
  PRIMARY KEY (emisor_id, ruta)
);
CREATE TABLE IF NOT EXISTS emisiones (
  id TEXT PRIMARY KEY,
  emisor_id TEXT NOT NULL REFERENCES emisores(id),
  plantilla_id TEXT NOT NULL REFERENCES plantillas(id),
  plantilla_nombre TEXT NOT NULL,
  titular_did TEXT NOT NULL,
  titular_address TEXT NOT NULL,
  estado TEXT NOT NULL,
  con_contexto INTEGER NOT NULL,
  contenido_cifrado TEXT NOT NULL,
  hash TEXT,
  tx_preparada TEXT,
  tx_hash TEXT,
  emitida_en TEXT,
  revocacion_pendiente TEXT,
  revocada_en TEXT,
  motivo_revocacion TEXT,
  tx_revocacion TEXT,
  creada_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS boveda (
  vc_id TEXT PRIMARY KEY,
  titular_address TEXT NOT NULL,
  emisor_id TEXT NOT NULL REFERENCES emisores(id),
  contenido_cifrado TEXT NOT NULL,
  emitida_en TEXT NOT NULL,
  revocada_en TEXT,
  motivo_revocacion TEXT
);

CREATE TABLE IF NOT EXISTS bloqueos (
  titular_address TEXT NOT NULL,
  emisor_id TEXT NOT NULL REFERENCES emisores(id),
  creado_en TEXT NOT NULL,
  PRIMARY KEY (titular_address, emisor_id)
);

CREATE TABLE IF NOT EXISTS cuentas_emisor (
  id TEXT PRIMARY KEY,
  correo TEXT NOT NULL UNIQUE,
  hash_contrasena TEXT NOT NULL,
  emisor_id TEXT NOT NULL UNIQUE REFERENCES emisores(id),
  correo_verificado_en TEXT NOT NULL,
  creada_en TEXT NOT NULL
);
-- Semilla de la cuenta de firma cifrada en el navegador con la contraseña:
-- la API no puede usarla.
CREATE TABLE IF NOT EXISTS llaves_emisor (
  emisor_id TEXT PRIMARY KEY REFERENCES emisores(id),
  llave_cifrada TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS registros_emisor (
  emisor_id TEXT PRIMARY KEY REFERENCES emisores(id),
  tipo_identificacion TEXT NOT NULL,
  identificacion TEXT NOT NULL,
  correo TEXT NOT NULL,
  provincia TEXT NOT NULL,
  rep_nombre TEXT NOT NULL,
  rep_tipo_identificacion TEXT NOT NULL,
  rep_identificacion TEXT NOT NULL,
  rep_cargo TEXT NOT NULL,
  rep_correo TEXT NOT NULL,
  rep_telefono TEXT NOT NULL,
  actualizado_en TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_titulares_emisor ON titulares(emisor_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_emisor ON plantillas(emisor_id);
CREATE INDEX IF NOT EXISTS idx_emisiones_emisor ON emisiones(emisor_id);
CREATE INDEX IF NOT EXISTS idx_boveda_titular ON boveda(titular_address);
`;
