import { canonicalizar } from "./canonico.js";
import { aBase64Url, desdeBase64, desdeUtf8, utf8 } from "./codificacion.js";
import { seleccionarDivulgaciones } from "./divulgacion.js";
import {
  presentacionSchema,
  type AtributoSeleccionable,
  type CredencialFirmada,
  type Divulgacion,
  type Presentacion,
} from "./modelo.js";

export function crearPresentacion(
  credencial: CredencialFirmada,
  divulgaciones: Divulgacion[],
  revelar: readonly AtributoSeleccionable[],
): Presentacion {
  return {
    v: 1,
    credencial,
    divulgaciones: seleccionarDivulgaciones(divulgaciones, revelar),
  };
}

async function transformar(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const salida = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(salida).arrayBuffer());
}

/**
 * Codifica la presentación para un enlace o código QR: JSON canónico,
 * comprimido con deflate y en base64url. Va en el fragmento (`#...`) del
 * enlace, que el navegador nunca envía al servidor.
 */
export async function codificarPresentacion(presentacion: Presentacion): Promise<string> {
  const comprimido = await transformar(
    utf8(canonicalizar(presentacion)),
    new CompressionStream("deflate-raw"),
  );
  return aBase64Url(comprimido);
}

export async function decodificarPresentacion(codigo: string): Promise<Presentacion> {
  let texto: string;
  try {
    texto = desdeUtf8(
      await transformar(desdeBase64(codigo.trim()), new DecompressionStream("deflate-raw")),
    );
  } catch {
    throw new Error("El código de la presentación está dañado o incompleto");
  }
  const resultado = presentacionSchema.safeParse(JSON.parse(texto));
  if (!resultado.success) {
    throw new Error("La presentación no tiene el formato esperado");
  }
  return resultado.data;
}
