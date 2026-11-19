"use client";

import { ETIQUETAS_CATEGORIA, type Emisor } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Boton, Cargando, Dialogo, EncabezadoPagina, Insignia, Vacio } from "@repo/ui";
import { Building2, Ban, ShieldCheck } from "lucide-react";
import { useCallback, useState } from "react";
import { useConsulta } from "../hooks/use-consulta";
import { mensajeError } from "../lib/errores";
import { AvisoError } from "./aviso-error";

type Accion = { tipo: "bloquear" | "desbloquear"; emisor: Emisor };

function FilaInstitucion({
  emisor,
  bloqueada,
  alElegir,
}: {
  emisor: Emisor;
  bloqueada: boolean;
  alElegir: (accion: Accion) => void;
}) {
  const sitio = emisor.sitioWeb && /^https?:\/\//i.test(emisor.sitioWeb) ? emisor.sitioWeb : null;
  return (
    <li className="flex flex-col gap-3 rounded-panel border border-linea bg-superficie p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-tinta">{emisor.nombre}</h3>
          {bloqueada && <Insignia tono="lacre">Bloqueada</Insignia>}
          {!bloqueada && emisor.estado === "suspendido" && (
            <Insignia tono="ambar">Suspendida</Insignia>
          )}
        </div>
        <p className="mt-0.5 text-sm text-tinta-suave">{ETIQUETAS_CATEGORIA[emisor.categoria]}</p>
        {sitio && (
          <a
            href={sitio}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-block break-all text-sm text-marino underline underline-offset-2"
          >
            {sitio.replace(/^https?:\/\//i, "")}
          </a>
        )}
      </div>
      {bloqueada ? (
        <Boton
          variante="secundario"
          className="shrink-0"
          onClick={() => alElegir({ tipo: "desbloquear", emisor })}
        >
          Desbloquear institución
        </Boton>
      ) : (
        <Boton
          variante="secundario"
          className="shrink-0"
          onClick={() => alElegir({ tipo: "bloquear", emisor })}
        >
          Bloquear institución
        </Boton>
      )}
    </li>
  );
}

/** Instituciones autorizadas y bloqueos del titular (RF-02). */
export function Instituciones() {
  const { api } = useSesion();
  const consultar = useCallback(
    () => Promise.all([api.listarEmisores("autorizado"), api.listarBloqueos()]),
    [api],
  );
  const { estado, recargar, actualizar } = useConsulta(consultar);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function confirmar() {
    if (!accion) return;
    setEnviando(true);
    setError(null);
    try {
      if (accion.tipo === "bloquear") await api.bloquearEmisor(accion.emisor.id);
      else await api.desbloquearEmisor(accion.emisor.id);
      setAviso(
        accion.tipo === "bloquear"
          ? `Bloqueaste a ${accion.emisor.nombre}. Ya no puede emitirte credenciales.`
          : `Desbloqueaste a ${accion.emisor.nombre}. Puede volver a emitirte credenciales.`,
      );
      setAccion(null);
      actualizar();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  function cerrarDialogo() {
    if (enviando) return;
    setAccion(null);
    setError(null);
  }

  const encabezado = (
    <EncabezadoPagina
      titulo="Instituciones"
      descripcion="Estas son las instituciones autorizadas para emitir credenciales. Si bloqueas una, no podrá emitirte credenciales nuevas. Las que ya tienes no cambian."
    />
  );

  if (estado.tipo === "cargando") {
    return (
      <>
        {encabezado}
        <Cargando texto="Cargando las instituciones" />
      </>
    );
  }
  if (estado.tipo === "error") {
    return (
      <>
        {encabezado}
        <AvisoError
          titulo="No pudimos cargar las instituciones"
          error={estado.error}
          alReintentar={recargar}
        />
      </>
    );
  }

  const [autorizadas, bloqueadas] = estado.datos;
  const idsBloqueadas = new Set(bloqueadas.map((e) => e.id));
  const disponibles = autorizadas
    .filter((e) => !idsBloqueadas.has(e.id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <div className="flex flex-col gap-8">
      {encabezado}

      {aviso && (
        <Aviso
          tipo="exito"
          titulo={aviso}
          accion={
            <Boton variante="fantasma" tamano="sm" className="-ml-3" onClick={() => setAviso(null)}>
              Entendido
            </Boton>
          }
        />
      )}

      {bloqueadas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-tinta">
            <Ban aria-hidden className="size-5 text-lacre" />
            Bloqueadas por ti
          </h2>
          <ul className="flex flex-col gap-3">
            {bloqueadas.map((emisor) => (
              <FilaInstitucion key={emisor.id} emisor={emisor} bloqueada alElegir={setAccion} />
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-tinta">
          <ShieldCheck aria-hidden className="size-5 text-sello" />
          Autorizadas
        </h2>
        {disponibles.length === 0 ? (
          <Vacio icono={<Building2 aria-hidden />} titulo="No hay otras instituciones autorizadas">
            {bloqueadas.length > 0
              ? "Todas las instituciones autorizadas están bloqueadas por ti."
              : "Cuando la entidad que autoriza apruebe instituciones, aparecerán aquí."}
          </Vacio>
        ) : (
          <ul className="flex flex-col gap-3">
            {disponibles.map((emisor) => (
              <FilaInstitucion
                key={emisor.id}
                emisor={emisor}
                bloqueada={false}
                alElegir={setAccion}
              />
            ))}
          </ul>
        )}
      </section>

      <Dialogo
        abierto={accion !== null}
        alCerrar={cerrarDialogo}
        titulo={
          accion?.tipo === "desbloquear"
            ? `¿Desbloquear a ${accion.emisor.nombre}?`
            : `¿Bloquear a ${accion?.emisor.nombre ?? "esta institución"}?`
        }
        descripcion={
          accion?.tipo === "desbloquear"
            ? "Podrá volver a emitirte credenciales nuevas."
            : "Mientras esté bloqueada, no podrá emitirte credenciales nuevas. Las credenciales que ya tienes se quedan en tu wallet y puedes desbloquearla cuando quieras."
        }
        acciones={
          <>
            <Boton variante="secundario" disabled={enviando} onClick={cerrarDialogo}>
              Cancelar
            </Boton>
            <Boton
              variante={accion?.tipo === "desbloquear" ? "primario" : "peligro"}
              cargando={enviando}
              onClick={() => void confirmar()}
            >
              {accion?.tipo === "desbloquear" ? "Desbloquear institución" : "Bloquear institución"}
            </Boton>
          </>
        }
      >
        {error && (
          <Aviso tipo="error" titulo="No se pudo guardar el cambio">
            {error}
          </Aviso>
        )}
      </Dialogo>
    </div>
  );
}
