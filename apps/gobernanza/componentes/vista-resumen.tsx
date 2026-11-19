"use client";

import type { Emisor, Indicador, ResumenGobernanza } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Cargando, EncabezadoPagina, Insignia, Panel, Vacio } from "@repo/ui";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useDatos } from "../lib/use-datos";
import { anunciarDecision } from "./acciones-emisor";
import { AvisoError } from "./aviso-error";
import { TarjetaEmisor } from "./tarjeta-emisor";

const numero = new Intl.NumberFormat("es-CR");

export function VistaResumen() {
  const { api } = useSesion();
  const cargar = useCallback(
    () => Promise.all([api.resumenGobernanza(), api.listarEmisores("pendiente")]),
    [api],
  );
  const { datos, error, recargar } = useDatos(cargar);
  const [anuncio, setAnuncio] = useState<string | null>(null);

  function alCambiar(emisor: Emisor) {
    setAnuncio(anunciarDecision(emisor));
    recargar();
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Resumen"
        descripcion="Qué instituciones pueden emitir, qué solicitudes esperan una decisión y cómo se cumplen las salvaguardas de la plataforma."
      />
      <div className="flex flex-col gap-10">
        {anuncio && (
          <Aviso tipo="exito" titulo="Decisión registrada">
            {anuncio}
          </Aviso>
        )}
        {error !== null && <AvisoError error={error} alReintentar={recargar} />}
        {datos === null ? (
          error === null && <Cargando texto="Cargando el resumen" />
        ) : (
          <>
            <Pendientes pendientes={datos[1]} alCambiar={alCambiar} />
            <Cifras resumen={datos[0]} />
            <Salvaguardas indicadores={datos[0].indicadores} />
          </>
        )}
      </div>
    </>
  );
}

function Seccion({
  id,
  titulo,
  descripcion,
  children,
}: {
  id: string;
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div>
        <h2 id={id} className="text-xl font-bold text-tinta">
          {titulo}
        </h2>
        {descripcion && <p className="mt-1 text-sm text-tinta-suave">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

function Pendientes({
  pendientes,
  alCambiar,
}: {
  pendientes: Emisor[];
  alCambiar: (emisor: Emisor) => void;
}) {
  const ordenadas = [...pendientes].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  return (
    <Seccion
      id="pendientes"
      titulo="Solicitudes por decidir"
      descripcion="Instituciones que pidieron autorización para emitir. Las más antiguas aparecen primero."
    >
      {ordenadas.length === 0 ? (
        <Vacio icono={<Inbox aria-hidden />} titulo="No hay solicitudes pendientes">
          Cuando una institución se registre en el portal de emisores, su solicitud aparecerá aquí.
        </Vacio>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {ordenadas.map((emisor) => (
            <li key={emisor.id}>
              <TarjetaEmisor emisor={emisor} alCambiar={alCambiar} />
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

function Cifras({ resumen }: { resumen: ResumenGobernanza }) {
  const grupos = [
    {
      titulo: "Instituciones",
      enlace: "/emisores",
      datos: [
        { termino: "Autorizadas", valor: resumen.emisores.autorizado },
        { termino: "Pendientes", valor: resumen.emisores.pendiente },
        { termino: "Suspendidas", valor: resumen.emisores.suspendido },
      ],
    },
    {
      titulo: "Actividad",
      enlace: null,
      datos: [
        { termino: "Credenciales emitidas", valor: resumen.credenciales.emitidas },
        { termino: "Credenciales revocadas", valor: resumen.credenciales.revocadas },
        { termino: "Titulares inscritos", valor: resumen.titulares },
        { termino: "Plantillas", valor: resumen.plantillas },
      ],
    },
  ];
  return (
    <Seccion id="cifras" titulo="Estado del registro">
      <Panel className="grid p-0! md:grid-cols-[3fr_4fr]">
        {grupos.map((grupo, i) => (
          <div
            key={grupo.titulo}
            className={
              i === 0
                ? "p-5 sm:px-6"
                : "border-t border-linea p-5 sm:px-6 md:border-l md:border-t-0"
            }
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-tinta">{grupo.titulo}</h3>
              {grupo.enlace && (
                <Link
                  href={grupo.enlace}
                  className="rounded-control text-sm text-tinta-suave underline underline-offset-2 hover:text-tinta"
                >
                  Ver instituciones
                </Link>
              )}
            </div>
            <dl
              className={
                grupo.datos.length === 3
                  ? "grid grid-cols-3 gap-x-4 gap-y-3"
                  : "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4"
              }
            >
              {grupo.datos.map((dato) => (
                <div key={dato.termino} className="flex flex-col justify-between gap-0.5">
                  <dt className="text-sm text-tinta-tenue">{dato.termino}</dt>
                  <dd className="text-[26px] font-bold text-marino cifras">{numero.format(dato.valor)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </Panel>
    </Seccion>
  );
}

function EstadoIndicador({ indicador }: { indicador: Indicador }) {
  return indicador.cumple ? <Insignia tono="sello">Cumple</Insignia> : <Insignia tono="ambar">Revisar</Insignia>;
}

function Salvaguardas({ indicadores }: { indicadores: Indicador[] }) {
  const revisar = indicadores.filter((i) => !i.cumple).length;
  return (
    <Seccion
      id="salvaguardas"
      titulo="Salvaguardas"
      descripcion="Indicadores que muestran si la plataforma respeta los compromisos con instituciones, titulares y verificadores."
    >
      {indicadores.length === 0 ? (
        <Vacio titulo="Aún no hay indicadores">
          La API todavía no reporta indicadores de salvaguardas. Vuelve a revisar cuando haya actividad.
        </Vacio>
      ) : (
        <>
          {revisar > 0 && (
            <Aviso tipo="advertencia" titulo={revisar === 1 ? "Un indicador necesita revisión" : `${revisar} indicadores necesitan revisión`}>
              Los indicadores marcados con Revisar no alcanzan su meta. Conviene revisarlos antes de tomar nuevas decisiones.
            </Aviso>
          )}
          <Panel className="hidden overflow-hidden p-0! sm:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Indicadores de salvaguardas</caption>
              <thead className="border-b border-linea bg-papel text-[11.5px] uppercase tracking-[0.08em] text-tinta-suave">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Indicador</th>
                  <th scope="col" className="px-5 py-3 font-medium">Salvaguarda que protege</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Valor actual</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Meta</th>
                  <th scope="col" className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {indicadores.map((indicador) => (
                  <tr key={indicador.id} className="align-top">
                    <th scope="row" className="px-5 py-3 font-medium text-tinta">{indicador.nombre}</th>
                    <td className="px-5 py-3 text-tinta-suave">{indicador.salvaguarda}</td>
                    <td className="px-5 py-3 text-right font-semibold text-tinta cifras">{indicador.valor}</td>
                    <td className="px-5 py-3 text-right text-tinta-suave cifras">{indicador.meta}</td>
                    <td className="px-5 py-3">
                      <EstadoIndicador indicador={indicador} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <ul className="flex flex-col gap-3 sm:hidden">
            {indicadores.map((indicador) => (
              <li key={indicador.id}>
                <Panel className="flex flex-col gap-3 p-4!">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-tinta">{indicador.nombre}</h3>
                    <EstadoIndicador indicador={indicador} />
                  </div>
                  <p className="text-sm text-tinta-suave">{indicador.salvaguarda}</p>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-tinta-tenue">Valor actual</dt>
                      <dd className="font-semibold text-tinta cifras">{indicador.valor}</dd>
                    </div>
                    <div>
                      <dt className="text-tinta-tenue">Meta</dt>
                      <dd className="text-tinta cifras">{indicador.meta}</dd>
                    </div>
                  </dl>
                </Panel>
              </li>
            ))}
          </ul>
        </>
      )}
    </Seccion>
  );
}
