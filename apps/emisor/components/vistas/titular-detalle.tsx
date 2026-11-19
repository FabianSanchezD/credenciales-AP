"use client";

import { useSesion } from "@repo/cliente/react";
import { Aviso, Boton, BotonCopiar, Cargando, Dialogo, Identificador, formatearFecha } from "@repo/ui";
import { Send, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { mensajeError } from "../../lib/errores";
import { useConsulta } from "../../lib/use-consulta";
import { useEmisor } from "../acceso";
import { EnlaceBoton, EnlaceTexto, ErrorCarga, InsigniaEmision } from "../comun";
import { resumirTitulares } from "./titulares";

export function VistaTitular() {
  const { id } = useParams<{ id: string }>();
  const { api } = useSesion();
  const emisor = useEmisor();
  const router = useRouter();
  const consulta = useConsulta(
    () => Promise.all([api.listarTitulares(emisor.id), api.listarEmisiones()]),
    `titular:${id}`,
  );
  const [quitar, setQuitar] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [titulares = [], emisiones = []] = consulta.datos ?? [];
  const fila = resumirTitulares(titulares, emisiones).find((f) => f.titular.id === id);

  return (
    <div className="flex flex-col gap-5">
      <div className="text-[13px] text-tinta-suave">
        <EnlaceTexto href="/titulares">Titulares</EnlaceTexto> › Titular
      </div>
      {consulta.error && <ErrorCarga mensaje={consulta.error} alReintentar={consulta.recargar} />}
      {consulta.cargando && !consulta.datos && <Cargando texto="Cargando titular" />}
      {consulta.datos && !fila && (
        <Aviso tipo="info" titulo="Este titular ya no está inscrito">
          <Link href="/titulares" className="underline">
            Volver a titulares
          </Link>
        </Aviso>
      )}
      {fila && (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-xl bg-tec-azul text-white">
              <UserRound className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-[1.375rem] font-bold leading-tight text-tec-azul">Titular</h1>
              <p className="text-sm text-tinta-suave">
                {fila.emitidas.length === 1 ? "1 credencial" : `${fila.emitidas.length} credenciales`} ·{" "}
                {fila.emitidas.length - fila.revocadas} vigentes
              </p>
            </div>
            <EnlaceBoton href={`/emitir?titulares=${encodeURIComponent(fila.titular.did)}`} icono={<Send aria-hidden className="size-4" />}>
              Emitir credencial
            </EnlaceBoton>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="flex flex-col gap-3" aria-labelledby="titulo-creds">
              <h2 id="titulo-creds" className="text-[17px] font-bold">
                Credenciales emitidas
              </h2>
              {fila.emitidas.length === 0 && <p className="text-sm text-tinta-suave">Todavía no le ha emitido credenciales.</p>}
              {fila.emitidas.map((e) => (
                <article key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3.5 gap-y-1.5 rounded-[10px] border border-linea bg-superficie p-4">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-lacre">Credencial</span>
                  <span className="row-span-2 self-start">
                    <InsigniaEmision estado={e.estado} />
                  </span>
                  <Link href={`/emisiones/${e.id}`} className="text-[15px] font-medium text-tinta hover:text-tec-azul hover:underline">
                    {e.plantillaNombre}
                  </Link>
                  <span className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-tinta-suave">
                    <span>Emitida {formatearFecha(e.emitidaEn)}</span>
                    {e.revocadaEn && <span className="text-lacre">Revocada {formatearFecha(e.revocadaEn)}</span>}
                    <span className="font-mono">{e.id.slice(0, 8).toUpperCase()}</span>
                    <BotonCopiar valor={e.id} etiqueta="Copiar código" />
                  </span>
                </article>
              ))}
            </section>
            <aside className="flex flex-col gap-3 rounded-[10px] border border-linea bg-superficie p-4">
              <h2 className="text-base font-bold">Datos del titular</h2>
              <span className="text-[13px] text-tinta-tenue">DID</span>
              <Identificador valor={fila.titular.did} etiqueta="Copiar DID" />
              <span className="text-[13px] text-tinta-tenue">Inscrito desde</span>
              <span className="text-sm">{formatearFecha(fila.titular.registradoEn)}</span>
              <p className="border-t border-linea pt-3 text-xs text-tinta-tenue">
                El DID no contiene datos personales: solo identifica la wallet que recibe las credenciales.
              </p>
              <Boton variante="fantasma" tamano="sm" onClick={() => setQuitar(true)}>
                Quitar titular
              </Boton>
            </aside>
          </div>
        </>
      )}
      <Dialogo
        abierto={quitar}
        alCerrar={() => setQuitar(false)}
        titulo="¿Quitar a este titular?"
        descripcion="Dejará de aparecer en su lista. Las credenciales que ya le emitió siguen en su wallet y siguen siendo válidas."
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setQuitar(false)} disabled={quitando}>
              Cancelar
            </Boton>
            <Boton
              variante="peligro"
              cargando={quitando}
              onClick={() => {
                if (!fila) return;
                setQuitando(true);
                setError(null);
                api.quitarTitular(emisor.id, fila.titular.id).then(
                  () => router.push("/titulares"),
                  (e: unknown) => {
                    setError(mensajeError(e));
                    setQuitando(false);
                  },
                );
              }}
            >
              Quitar titular
            </Boton>
          </>
        }
      >
        {error && (
          <Aviso tipo="error" titulo="No se pudo quitar">
            {error}
          </Aviso>
        )}
      </Dialogo>
    </div>
  );
}
