import { canonicalizar } from "./canonico.js";
import { aBase64Url, bytesAleatorios, sha256Bytes } from "./codificacion.js";
import {
  ATRIBUTOS_SELECCIONABLES,
  type AtributoSeleccionable,
  type AtributosSeleccionables,
  type Divulgacion,
} from "./modelo.js";

export function digestDivulgacion(divulgacion: Divulgacion): string {
  return aBase64Url(sha256Bytes(canonicalizar(divulgacion)));
}

/**
 * Convierte los atributos seleccionables en divulgaciones con sal aleatoria.
 * Devuelve también los hashes que van dentro de la credencial firmada.
 */
export function crearDivulgaciones(atributos: AtributosSeleccionables): {
  divulgaciones: Divulgacion[];
  digests: string[];
} {
  const divulgaciones: Divulgacion[] = [];
  for (const nombre of ATRIBUTOS_SELECCIONABLES) {
    const valor = atributos[nombre];
    if (valor === undefined) continue;
    divulgaciones.push([aBase64Url(bytesAleatorios(16)), nombre, valor]);
  }
  const digests = divulgaciones.map(digestDivulgacion).sort();
  return { divulgaciones, digests };
}

/** Filtra las divulgaciones que el titular eligió revelar. */
export function seleccionarDivulgaciones(
  divulgaciones: Divulgacion[],
  revelar: readonly AtributoSeleccionable[],
): Divulgacion[] {
  return divulgaciones.filter(([, nombre]) => revelar.includes(nombre));
}

/** Atributos legibles a partir de divulgaciones ya verificadas. */
export function atributosRevelados(
  divulgaciones: Divulgacion[],
): Partial<AtributosSeleccionables> {
  const resultado: Partial<Record<AtributoSeleccionable, unknown>> = {};
  for (const [, nombre, valor] of divulgaciones) resultado[nombre] = valor;
  return resultado as Partial<AtributosSeleccionables>;
}
