import {
  ETIQUETAS_MODALIDAD,
  ETIQUETAS_NIVEL,
  ETIQUETAS_TIPO_APRENDIZAJE,
  type AtributosSeleccionables,
} from "@repo/credenciales";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { Sello, type EstadoSello } from "./sello";

export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "long" }).format(new Date(iso));
}

export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

/** "40 h · Intermedio · Virtual · No formal" */
export function resumenContexto(contexto: AtributosSeleccionables["contexto"]): string {
  return [
    `${contexto.horas} h`,
    ETIQUETAS_NIVEL[contexto.nivel],
    ETIQUETAS_MODALIDAD[contexto.modalidad],
    ETIQUETAS_TIPO_APRENDIZAJE[contexto.tipoAprendizaje],
  ].join(", ");
}

/**
 * La credencial como documento: emisor arriba, logro en serif, sello a la
 * derecha. La usan la wallet (lista y detalle) y el verificador.
 */
export function DocumentoCredencial({
  emisor,
  logro,
  descripcion,
  emitidaEn,
  estado,
  estampar,
  pie,
  compacto = false,
  className,
}: {
  emisor: string;
  logro: string;
  descripcion?: string;
  emitidaEn: string | null;
  estado: EstadoSello;
  estampar?: boolean;
  pie?: ReactNode;
  compacto?: boolean;
  className?: string;
}) {
  const atenuada = estado === "revocada" || estado === "invalida";
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-documento border border-linea bg-superficie shadow-documento",
        compacto ? "p-5" : "p-6 sm:p-8",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-1.5",
          estado === "valida" && "bg-sello",
          estado === "pendiente" && "bg-ambar",
          atenuada && "bg-lacre",
        )}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-tinta-suave">{emisor}</p>
          <h3
            className={cn(
              "mt-2 font-serif font-medium leading-tight text-tinta",
              compacto ? "text-xl" : "text-2xl sm:text-[1.875rem]",
              atenuada && "text-tinta-suave line-through decoration-lacre/60 decoration-2",
            )}
          >
            {logro}
          </h3>
          {descripcion && !compacto && (
            <p className="mt-3 max-w-prose text-tinta-suave">{descripcion}</p>
          )}
          <p className="mt-3 text-sm text-tinta-tenue">Emitida el {formatearFecha(emitidaEn)}</p>
        </div>
        <Sello
          estado={estado}
          tamano={compacto ? 76 : 112}
          estampar={estampar}
          className={compacto ? undefined : "size-[76px] sm:size-[112px]"}
        />
      </div>
      {pie && <div className="mt-5 border-t border-linea pt-4">{pie}</div>}
    </article>
  );
}
