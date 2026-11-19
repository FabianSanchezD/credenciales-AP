/** Un código de presentación es base64url: letras, números, `-` y `_`. */
const FORMATO_CODIGO = /^[A-Za-z0-9_-]+={0,2}$/;

function normalizar(texto: string): string {
  let limpio = texto;
  try {
    limpio = decodeURIComponent(limpio);
  } catch {
    // Si no se puede decodificar, se usa tal cual y la validación decide.
  }
  return limpio.replace(/\s+/g, "");
}

export function esCodigoValido(codigo: string): boolean {
  return codigo.length > 0 && FORMATO_CODIGO.test(codigo);
}

/**
 * Acepta un enlace completo (`https://.../v#codigo`) o solo el código.
 * Devuelve `null` si no encuentra un código con el formato esperado.
 */
export function extraerCodigo(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const almohadilla = limpio.indexOf("#");
  let codigo: string;
  if (almohadilla >= 0) codigo = limpio.slice(almohadilla + 1);
  else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(limpio)) return null;
  else codigo = limpio;
  codigo = normalizar(codigo);
  return esCodigoValido(codigo) ? codigo : null;
}

/** Código que trae el fragmento de la URL actual, sin el `#`. */
export function codigoDelFragmento(hash: string): string {
  return normalizar(hash.startsWith("#") ? hash.slice(1) : hash);
}

/**
 * Abre el resultado. Es una navegación completa a propósito: el código va en
 * el fragmento, que el navegador no envía al servidor ni queda en sus registros.
 */
export function abrirVerificacion(codigo: string): void {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- navegación completa a propósito
  window.location.assign(`/v#${codigo}`);
}
