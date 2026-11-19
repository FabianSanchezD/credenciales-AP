"use client";

import type { Plantilla } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Cargando, EncabezadoPagina, Insignia, Panel, Vacio, formatearFecha, resumenContexto } from "@repo/ui";
import { FilePlus2, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useConsulta } from "../../lib/use-consulta";
import { EnlaceBoton, ErrorCarga } from "../comun";

function TarjetaPlantilla({ plantilla }: { plantilla: Plantilla }) {
  const resultados = plantilla.resultadosAprendizaje.length;
  return (
    <li>
      <Panel className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl font-medium leading-tight text-tinta">
            <Link
              href={`/plantillas/${plantilla.id}`}
              className="rounded-control hover:underline hover:decoration-linea-fuerte hover:underline-offset-4"
            >
              {plantilla.nombre}
            </Link>
          </h3>
          <Insignia tono={plantilla.archivada ? "neutro" : "marino"}>Versión {plantilla.version}</Insignia>
        </div>
        <p className="line-clamp-2 text-sm text-tinta-suave">{plantilla.descripcion}</p>
        <p className="text-sm text-tinta-tenue">
          {resumenContexto(plantilla.contexto)}. {resultados === 1 ? "1 resultado" : `${resultados} resultados`} de
          aprendizaje.
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <EnlaceBoton href={`/plantillas/${plantilla.id}`} variante="secundario" tamano="sm">
            Ver plantilla
          </EnlaceBoton>
          {!plantilla.archivada && (
            <EnlaceBoton href={`/emitir?plantilla=${plantilla.id}`} variante="fantasma" tamano="sm">
              Emitir con esta plantilla
            </EnlaceBoton>
          )}
          <span className="ml-auto text-xs text-tinta-tenue">Actualizada el {formatearFecha(plantilla.actualizadaEn)}</span>
        </div>
      </Panel>
    </li>
  );
}

export function VistaPlantillas() {
  const { api } = useSesion();
  const consulta = useConsulta(() => api.listarPlantillas(), "plantillas");
  const plantillas = consulta.datos ?? [];
  const activas = plantillas.filter((p) => !p.archivada);
  const archivadas = plantillas.filter((p) => p.archivada);

  return (
    <>
      <EncabezadoPagina
        titulo="Plantillas"
        descripcion="Cada plantilla describe un curso o logro: qué se aprendió y en qué contexto. Toda credencial se emite a partir de una plantilla."
        acciones={
          <EnlaceBoton href="/plantillas/nueva" icono={<FilePlus2 aria-hidden className="size-4" />}>
            Crear plantilla
          </EnlaceBoton>
        }
      />
      {consulta.error && <ErrorCarga mensaje={consulta.error} alReintentar={consulta.recargar} />}
      {consulta.cargando && !consulta.datos && <Cargando texto="Cargando plantillas" />}
      {consulta.datos && activas.length === 0 && (
        <Vacio
          icono={<LayoutTemplate aria-hidden />}
          titulo={archivadas.length ? "No tienes plantillas activas" : "Todavía no tienes plantillas"}
          accion={<EnlaceBoton href="/plantillas/nueva">Crear plantilla</EnlaceBoton>}
        >
          Crea una plantilla con los resultados de aprendizaje y el contexto del curso. Después podrás
          emitir credenciales a partir de ella.
        </Vacio>
      )}
      {activas.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {activas.map((p) => (
            <TarjetaPlantilla key={p.id} plantilla={p} />
          ))}
        </ul>
      )}
      {archivadas.length > 0 && (
        <section className="mt-10" aria-labelledby="titulo-archivadas">
          <h2 id="titulo-archivadas" className="text-lg font-semibold text-tinta">
            Archivadas
          </h2>
          <p className="mt-1 mb-4 text-sm text-tinta-suave">
            Ya no se usan para emitir. Las credenciales emitidas con ellas siguen siendo válidas.
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            {archivadas.map((p) => (
              <TarjetaPlantilla key={p.id} plantilla={p} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
