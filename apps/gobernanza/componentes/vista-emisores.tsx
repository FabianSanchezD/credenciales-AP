"use client";

import type { Emisor, EstadoEmisor } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Cargando, cn, EncabezadoPagina, Vacio } from "@repo/ui";
import { Building2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useDatos } from "../lib/use-datos";
import { anunciarDecision } from "./acciones-emisor";
import { AvisoError } from "./aviso-error";
import { TarjetaEmisor } from "./tarjeta-emisor";

const FILTROS: Array<{ estado: EstadoEmisor; etiqueta: string; vacio: string; ayuda: string }> = [
  {
    estado: "pendiente",
    etiqueta: "Pendientes",
    vacio: "No hay solicitudes pendientes",
    ayuda: "Cuando una institución se registre en el portal de emisores, su solicitud aparecerá aquí.",
  },
  {
    estado: "autorizado",
    etiqueta: "Autorizadas",
    vacio: "No hay instituciones autorizadas",
    ayuda: "Las instituciones que autorices aparecerán aquí y podrán emitir credenciales.",
  },
  {
    estado: "suspendido",
    etiqueta: "Suspendidas",
    vacio: "No hay instituciones suspendidas",
    ayuda: "Si suspendes una institución, aparecerá aquí. Sus credenciales emitidas siguen siendo válidas.",
  },
];

function esEstado(valor: string | null): valor is EstadoEmisor {
  return FILTROS.some((f) => f.estado === valor);
}

export function VistaEmisores() {
  const { api } = useSesion();
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const consulta = parametros.get("estado");
  const estado: EstadoEmisor = esEstado(consulta) ? consulta : "pendiente";

  const cargar = useCallback(() => api.listarEmisores(), [api]);
  const { datos, error, recargar } = useDatos(cargar);
  const [anuncio, setAnuncio] = useState<string | null>(null);

  function alCambiar(emisor: Emisor) {
    setAnuncio(anunciarDecision(emisor));
    recargar();
  }

  function filtrar(nuevo: EstadoEmisor) {
    setAnuncio(null);
    router.replace(nuevo === "pendiente" ? ruta : `${ruta}?estado=${nuevo}`, { scroll: false });
  }

  const conteo = (e: EstadoEmisor) => datos?.filter((emisor) => emisor.estado === e).length ?? 0;
  const filtro = FILTROS.find((f) => f.estado === estado) ?? FILTROS[0]!;
  const visibles = (datos ?? [])
    .filter((emisor) => emisor.estado === estado)
    .sort((a, b) =>
      estado === "pendiente"
        ? a.creadoEn.localeCompare(b.creadoEn)
        : a.nombre.localeCompare(b.nombre, "es"),
    );

  return (
    <>
      <EncabezadoPagina
        titulo="Instituciones"
        descripcion="Decide qué instituciones pueden emitir credenciales. Cada decisión queda registrada con su motivo."
      />
      <div className="flex flex-col gap-6">
        <div
          role="group"
          aria-label="Filtrar instituciones por estado"
          className="grid grid-cols-3 gap-1 rounded-panel border border-linea bg-hundido p-1 sm:inline-flex sm:self-start"
        >
          {FILTROS.map((f) => {
            const activo = f.estado === estado;
            return (
              <button
                key={f.estado}
                type="button"
                aria-pressed={activo}
                onClick={() => filtrar(f.estado)}
                className={cn(
                  "inline-flex min-h-10 flex-col items-center justify-center gap-x-2 rounded-control px-2 py-1.5 text-sm font-medium transition-colors sm:flex-row sm:px-4",
                  activo
                    ? "bg-superficie text-tinta shadow-[inset_0_0_0_1px_var(--color-linea)]"
                    : "text-tinta-suave hover:text-tinta",
                )}
              >
                <span>{f.etiqueta}</span>
                <span className={cn("text-xs cifras", activo ? "text-tinta-suave" : "text-tinta-tenue")}>
                  {datos ? conteo(f.estado) : ""}
                  <span className="sr-only"> instituciones</span>
                </span>
              </button>
            );
          })}
        </div>

        {anuncio && (
          <Aviso tipo="exito" titulo="Decisión registrada">
            {anuncio}
          </Aviso>
        )}
        {error !== null && <AvisoError error={error} alReintentar={recargar} />}

        {datos === null ? (
          error === null && <Cargando texto="Cargando instituciones" />
        ) : visibles.length === 0 ? (
          <Vacio icono={<Building2 aria-hidden />} titulo={filtro.vacio}>
            {filtro.ayuda}
          </Vacio>
        ) : (
          <section aria-label={`Instituciones ${filtro.etiqueta.toLowerCase()}`}>
            <ul className="grid gap-4 lg:grid-cols-2">
              {visibles.map((emisor) => (
                <li key={emisor.id}>
                  <TarjetaEmisor emisor={emisor} alCambiar={alCambiar} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
