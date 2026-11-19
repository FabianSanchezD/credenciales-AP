/**
 * JSON canónico según RFC 8785 (JCS): claves ordenadas por unidades UTF-16,
 * sin espacios, y números y cadenas serializados como `JSON.stringify`.
 * Es lo que se firma y lo que se hashea, así que dos credenciales con el mismo
 * contenido producen siempre los mismos bytes.
 */
export function canonicalizar(valor: unknown): string {
  if (valor === null || typeof valor === "boolean") return JSON.stringify(valor);
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) {
      throw new Error("JCS no admite NaN ni infinitos");
    }
    return JSON.stringify(valor);
  }
  if (typeof valor === "string") return JSON.stringify(valor);
  if (Array.isArray(valor)) {
    return `[${valor.map((item) => canonicalizar(item === undefined ? null : item)).join(",")}]`;
  }
  if (typeof valor === "object") {
    const entradas = Object.entries(valor as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entradas
      .map(([clave, v]) => `${JSON.stringify(clave)}:${canonicalizar(v)}`)
      .join(",")}}`;
  }
  throw new Error(`Tipo no serializable en JCS: ${typeof valor}`);
}
