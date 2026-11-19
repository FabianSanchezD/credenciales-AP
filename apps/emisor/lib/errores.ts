import { ErrorApi } from "@repo/cliente";

/**
 * Convierte cualquier error (API, wallet, red) en un mensaje en español que
 * diga qué pasó. Los mensajes de `ErrorApi` ya vienen en español.
 */
export function mensajeError(
  error: unknown,
  respaldo = "Algo salió mal. Intenta de nuevo en un momento.",
): string {
  if (error instanceof ErrorApi) return error.message;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message === "string" && message) return message;
  }
  return respaldo;
}
