"use client";

import { ETIQUETAS_CATEGORIA, type Emisor } from "@repo/cliente";
import { formatearFecha, Identificador, ListaDatos, Panel } from "@repo/ui";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { AccionesEmisor } from "./acciones-emisor";
import { dominio, InsigniaEstado } from "./estado-emisor";

export function EnlaceSitio({ url }: { url: string | null }) {
  if (!url) return <span className="text-tinta-tenue">Sin sitio web registrado</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 break-all rounded-control text-marino underline underline-offset-2 hover:text-tinta"
    >
      {dominio(url)}
      <ExternalLink aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only">(se abre en otra pestaña)</span>
    </a>
  );
}

/** Una institución en la lista, con sus datos clave y la decisión disponible. */
export function TarjetaEmisor({
  emisor,
  alCambiar,
}: {
  emisor: Emisor;
  alCambiar: (actualizado: Emisor) => void;
}) {
  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-tinta">
            <Link
              href={`/emisores/${emisor.id}`}
              className="rounded-control underline-offset-2 hover:underline"
            >
              {emisor.nombre}
            </Link>
          </h3>
          <p className="text-sm text-tinta-suave">{ETIQUETAS_CATEGORIA[emisor.categoria]}</p>
        </div>
        <InsigniaEstado estado={emisor.estado} />
      </div>
      <ListaDatos
        datos={[
          { termino: "Sitio web", valor: <EnlaceSitio url={emisor.sitioWeb} /> },
          { termino: "DID", valor: <Identificador valor={emisor.did} etiqueta="Copiar DID" /> },
          { termino: "Solicitud recibida", valor: formatearFecha(emisor.creadoEn) },
          {
            termino: "Último motivo",
            valor: emisor.motivoEstado ?? <span className="text-tinta-tenue">Sin decisiones registradas</span>,
          },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-4">
        <AccionesEmisor emisor={emisor} alCambiar={alCambiar} tamano="sm" />
        <Link
          href={`/emisores/${emisor.id}`}
          className="rounded-control text-sm font-medium text-tinta-suave underline underline-offset-2 hover:text-tinta"
        >
          Ver detalle de la institución
        </Link>
      </div>
    </Panel>
  );
}
