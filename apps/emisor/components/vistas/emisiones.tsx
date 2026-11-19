"use client";

import { ESTADOS_EMISION, type Emision, type EstadoEmision } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Cargando, EncabezadoPagina, Vacio, abreviar, cn, formatearFecha } from "@repo/ui";
import { FileCheck2, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ETIQUETAS_ESTADO_EMISION, ordenarEmisiones } from "../../lib/emisiones";
import { useConsulta } from "../../lib/use-consulta";
import { EnlaceBoton, ErrorCarga, InsigniaEmision } from "../comun";

type Filtro = EstadoEmision | "todas";

function fechaPrincipal(e: Emision): string {
  return formatearFecha(e.revocadaEn ?? e.emitidaEn ?? e.creadaEn);
}

/** Lista de emisiones: tabla en pantallas anchas, lista apilada en móvil. */
export function TablaEmisiones({ emisiones }: { emisiones: Emision[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-panel border border-linea bg-superficie md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linea bg-hundido/60 text-tinta-suave">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Credencial</th>
              <th scope="col" className="px-4 py-3 font-semibold">Titular</th>
              <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
              <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {emisiones.map((e) => (
              <tr key={e.id} className="hover:bg-hundido/40">
                <td className="px-4 py-3">
                  <Link href={`/emisiones/${e.id}`} className="font-semibold text-tinta hover:underline">
                    {e.plantillaNombre}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <code title={e.titularDid} className="font-mono text-[0.8125rem] text-tinta-suave">
                    {abreviar(e.titularDid, 22, 6)}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <InsigniaEmision estado={e.estado} />
                </td>
                <td className="px-4 py-3 text-tinta-suave">{fechaPrincipal(e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col divide-y divide-linea rounded-panel border border-linea bg-superficie md:hidden">
        {emisiones.map((e) => (
          <li key={e.id}>
            <Link href={`/emisiones/${e.id}`} className="flex flex-col gap-1.5 p-4 hover:bg-hundido/40">
              <span className="flex items-start justify-between gap-3">
                <span className="font-semibold text-tinta">{e.plantillaNombre}</span>
                <InsigniaEmision estado={e.estado} />
              </span>
              <code title={e.titularDid} className="truncate font-mono text-[0.8125rem] text-tinta-suave">
                {abreviar(e.titularDid, 22, 6)}
              </code>
              <span className="text-sm text-tinta-tenue">{fechaPrincipal(e)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function VistaEmisiones() {
  const { api } = useSesion();
  const consulta = useConsulta(() => api.listarEmisiones(), "emisiones");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const todas = ordenarEmisiones(consulta.datos ?? []);
  const visibles = filtro === "todas" ? todas : todas.filter((e) => e.estado === filtro);
  const cuenta = (estado: Filtro) =>
    estado === "todas" ? todas.length : todas.filter((e) => e.estado === estado).length;

  return (
    <>
      <EncabezadoPagina
        titulo="Emisiones"
        descripcion="Todas las credenciales que tu institución ha emitido o dejado en borrador. Abre una para ver su anclaje o revocarla."
        acciones={
          <EnlaceBoton href="/emitir" icono={<Send aria-hidden className="size-4" />}>
            Emitir credencial
          </EnlaceBoton>
        }
      />
      {consulta.error && <ErrorCarga mensaje={consulta.error} alReintentar={consulta.recargar} />}
      {consulta.cargando && !consulta.datos && <Cargando texto="Cargando emisiones" />}
      {consulta.datos && todas.length === 0 && (
        <Vacio
          icono={<FileCheck2 aria-hidden />}
          titulo="Todavía no has emitido credenciales"
          accion={<EnlaceBoton href="/emitir">Emitir credencial</EnlaceBoton>}
        >
          Cuando emitas la primera, aparecerá aquí con su estado y el enlace a su anclaje en Stellar.
        </Vacio>
      )}
      {todas.length > 0 && (
        <div className="flex flex-col gap-4">
          <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
            {(["todas", ...ESTADOS_EMISION] as Filtro[]).map((opcion) => (
              <button
                key={opcion}
                type="button"
                aria-pressed={filtro === opcion}
                onClick={() => setFiltro(opcion)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                  filtro === opcion
                    ? "border-tinta bg-tinta text-superficie"
                    : "border-linea bg-superficie text-tinta-suave hover:border-linea-fuerte hover:text-tinta",
                )}
              >
                {opcion === "todas" ? "Todas" : ETIQUETAS_ESTADO_EMISION[opcion]}
                <span className="cifras opacity-75">{cuenta(opcion)}</span>
              </button>
            ))}
          </div>
          {visibles.length > 0 ? (
            <TablaEmisiones emisiones={visibles} />
          ) : (
            <p className="rounded-panel border border-dashed border-linea-fuerte px-4 py-8 text-center text-tinta-suave">
              No hay emisiones en este estado.
            </p>
          )}
        </div>
      )}
    </>
  );
}
