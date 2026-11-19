import { ClienteApi } from "@repo/cliente";
import { env } from "./env";

/** Si la API no responde en este tiempo, mostramos el error y la opción de reintentar. */
const LIMITE_MS = 20_000;

/** Cliente sin sesión: el verificador público nunca inicia sesión. */
export const api = new ClienteApi({
  baseUrl: env.apiUrl,
  fetch: (entrada, opciones) =>
    globalThis.fetch(entrada, { ...opciones, signal: AbortSignal.timeout(LIMITE_MS) }),
});
