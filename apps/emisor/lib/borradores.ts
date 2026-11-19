import type { TransaccionPorFirmar } from "@repo/cliente";

/**
 * Pasos pendientes de una emisión sin terminar, guardados solo en esta pestaña
 * (sessionStorage). Permiten retomar la emisión exacta desde su detalle sin
 * prepararla de nuevo. Se borran al cerrar la pestaña o al terminar.
 */
export interface PasoPendiente {
  emisionId: string;
  mensajeAFirmar?: string;
  transaccion?: TransaccionPorFirmar;
}

const prefijo = "credenciales-ap:emisor:borrador:";

function almacen(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function guardarPaso(paso: PasoPendiente): void {
  try {
    almacen()?.setItem(prefijo + paso.emisionId, JSON.stringify(paso));
  } catch {
    // Sin almacenamiento, la emisión se puede preparar de nuevo.
  }
}

export function leerPaso(emisionId: string): PasoPendiente | null {
  try {
    const texto = almacen()?.getItem(prefijo + emisionId);
    return texto ? (JSON.parse(texto) as PasoPendiente) : null;
  } catch {
    return null;
  }
}

export function olvidarPaso(emisionId: string): void {
  try {
    almacen()?.removeItem(prefijo + emisionId);
  } catch {
    // Nada que limpiar.
  }
}
