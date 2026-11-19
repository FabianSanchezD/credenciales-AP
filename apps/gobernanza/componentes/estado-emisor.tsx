import type { EstadoEmisor } from "@repo/cliente";
import { Insignia, type TonoEstado } from "@repo/ui";

export const ETIQUETAS_ESTADO: Record<EstadoEmisor, string> = {
  pendiente: "Pendiente",
  correcciones: "Con correcciones",
  autorizado: "Autorizada",
  rechazado: "Rechazada",
  suspendido: "Suspendida",
};

const TONOS: Record<EstadoEmisor, TonoEstado> = {
  pendiente: "ambar",
  correcciones: "marino",
  autorizado: "sello",
  rechazado: "lacre",
  suspendido: "lacre",
};

export function InsigniaEstado({ estado }: { estado: EstadoEmisor }) {
  return <Insignia tono={TONOS[estado]}>{ETIQUETAS_ESTADO[estado]}</Insignia>;
}

/** Muestra el dominio del sitio web, sin protocolo ni barra final. */
export function dominio(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
