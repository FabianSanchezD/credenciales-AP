"use client";

import { ErrorApi, ETIQUETAS_CATEGORIA, type Emisor } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import {
  Aviso,
  Cargando,
  EncabezadoPagina,
  formatearFecha,
  formatearFechaHora,
  Identificador,
  ListaDatos,
  Panel,
  Vacio,
} from "@repo/ui";
import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useDatos } from "../lib/use-datos";
import { AccionesEmisor, anunciarDecision } from "./acciones-emisor";
import { AvisoError } from "./aviso-error";
import { DatosSolicitud } from "./datos-solicitud";
import { InsigniaEstado } from "./estado-emisor";
import { EnlaceSitio } from "./tarjeta-emisor";

const CONSECUENCIA: Record<Emisor["estado"], string> = {
  pendiente: "Todavía no puede emitir credenciales. Espera una decisión de la entidad que autoriza.",
  correcciones:
    "Se le pidió corregir la solicitud. Cuando la reenvíe volverá a quedar pendiente de revisión.",
  rechazado: "La solicitud fue rechazada. La institución no puede emitir credenciales.",
  autorizado: "Puede emitir credenciales a sus titulares con sus propias plantillas.",
  suspendido:
    "No puede emitir credenciales nuevas. Las credenciales que emitió antes de la suspensión siguen siendo válidas.",
};

function Volver() {
  return (
    <Link
      href="/emisores"
      className="mb-4 inline-flex items-center gap-1.5 rounded-control text-sm font-medium text-tinta-suave hover:text-tinta"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Volver a instituciones
    </Link>
  );
}

export function VistaDetalle({ id }: { id: string }) {
  const { api } = useSesion();
  const cargar = useCallback(() => api.obtenerEmisor(id), [api, id]);
  const { datos: emisor, error, recargar } = useDatos(cargar);
  const [anuncio, setAnuncio] = useState<string | null>(null);

  if (emisor === null) {
    if (error instanceof ErrorApi && error.status === 404) {
      return (
        <>
          <Volver />
          <Vacio icono={<SearchX aria-hidden />} titulo="No encontramos esta institución">
            Puede que el enlace esté incompleto. Vuelve a la lista de instituciones y elígela desde ahí.
          </Vacio>
        </>
      );
    }
    return (
      <>
        <Volver />
        {error !== null ? (
          <AvisoError error={error} alReintentar={recargar} />
        ) : (
          <Cargando texto="Cargando la institución" />
        )}
      </>
    );
  }

  function alCambiar(actualizado: Emisor) {
    setAnuncio(anunciarDecision(actualizado));
    recargar();
  }

  const historial = [
    { evento: "Solicitud recibida", fecha: emisor.creadoEn },
    { evento: "Autorizada", fecha: emisor.autorizadoEn },
    { evento: "Suspendida", fecha: emisor.suspendidoEn },
  ]
    .filter((h): h is { evento: string; fecha: string } => h.fecha !== null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <>
      <Volver />
      <EncabezadoPagina
        titulo={emisor.nombre}
        descripcion={ETIQUETAS_CATEGORIA[emisor.categoria]}
        acciones={<AccionesEmisor emisor={emisor} alCambiar={alCambiar} />}
      />
      <div className="flex flex-col gap-6">
        {anuncio && (
          <Aviso tipo="exito" titulo="Decisión registrada">
            {anuncio}
          </Aviso>
        )}
        {error !== null && <AvisoError error={error} alReintentar={recargar} />}

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <Panel className="flex flex-col gap-5 lg:order-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-tinta">Estado</h2>
              <InsigniaEstado estado={emisor.estado} />
            </div>
            <p className="text-sm text-tinta-suave">{CONSECUENCIA[emisor.estado]}</p>
            <ListaDatos
              datos={[
                {
                  termino: "Motivo del último cambio",
                  valor: emisor.motivoEstado ?? (
                    <span className="text-tinta-tenue">Sin decisiones registradas</span>
                  ),
                },
                { termino: "Autorizada el", valor: emisor.autorizadoEn ? formatearFecha(emisor.autorizadoEn) : "Nunca" },
                { termino: "Suspendida el", valor: emisor.suspendidoEn ? formatearFecha(emisor.suspendidoEn) : "Nunca" },
              ]}
            />
            <div className="border-t border-linea pt-4">
              <h3 className="mb-3 text-sm font-semibold text-tinta">Historial de estado</h3>
              <ol className="flex flex-col gap-3 border-l border-linea-fuerte pl-4">
                {historial.map((h) => (
                  <li key={h.evento} className="relative text-sm">
                    <span
                      aria-hidden
                      className="absolute -left-[1.3125rem] top-1.5 size-2 rounded-full bg-linea-fuerte"
                    />
                    <span className="font-medium text-tinta">{h.evento}</span>
                    <span className="block text-tinta-suave">{formatearFechaHora(h.fecha)}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-tinta-tenue">
                Se muestra la fecha más reciente de cada cambio. El motivo corresponde a la última decisión.
              </p>
            </div>
          </Panel>
          <div className="flex flex-col gap-6 lg:order-1">
          <Panel className="flex flex-col gap-5">
            <h2 className="text-lg font-semibold text-tinta">Datos de la institución</h2>
            <ListaDatos
              datos={[
                { termino: "Nombre", valor: emisor.nombre },
                { termino: "Categoría", valor: ETIQUETAS_CATEGORIA[emisor.categoria] },
                { termino: "Sitio web", valor: <EnlaceSitio url={emisor.sitioWeb} /> },
                { termino: "DID", valor: <Identificador valor={emisor.did} etiqueta="Copiar DID" /> },
                {
                  termino: "Cuenta Stellar",
                  valor: <Identificador valor={emisor.stellarAddress} etiqueta="Copiar cuenta" />,
                },
                { termino: "Solicitud recibida", valor: formatearFechaHora(emisor.creadoEn) },
                { termino: "Última actualización", valor: formatearFechaHora(emisor.actualizadoEn) },
              ]}
            />
          </Panel>
          <DatosSolicitud emisorId={emisor.id} />
          </div>
        </div>
      </div>
    </>
  );
}
