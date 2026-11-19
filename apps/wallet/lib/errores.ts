import { ErrorApi } from "@repo/cliente";

/** Mensaje en español para mostrar al titular. */
export function mensajeError(
  error: unknown,
  alternativo = "Algo salió mal. Intenta de nuevo.",
): string {
  if (error instanceof ErrorApi) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return alternativo;
}

export function esSesionVencida(error: unknown): boolean {
  return error instanceof ErrorApi && error.status === 401;
}
