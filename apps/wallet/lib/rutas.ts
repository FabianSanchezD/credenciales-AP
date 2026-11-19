/** Los segmentos de ruta pueden llegar codificados. */
export function decodificarId(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}
