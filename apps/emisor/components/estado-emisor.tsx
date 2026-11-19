"use client";

import type { Emisor, RegistroEmisor as Registro } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Boton, Cargando, cn, formatearFecha, formatearFechaHora, Insignia } from "@repo/ui";
import { Check, Info, Pencil, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useMiRegistro } from "../lib/use-mi-registro";
import { RegistroEmisor } from "./registro-emisor";

/** Folio legible de la solicitud a partir del id del emisor. */
export function folio(emisor: Emisor): string {
  return `SOL-${emisor.creadoEn.slice(0, 4)}-${emisor.id.slice(0, 6).toUpperCase()}`;
}

/** Mientras se espera una decisión, vuelve a leer la sesión cada 30 s. */
function useRevisarPeriodicamente() {
  const { refrescar } = useSesion();
  useEffect(() => {
    const id = window.setInterval(() => void refrescar().catch(() => undefined), 30_000);
    return () => window.clearInterval(id);
  }, [refrescar]);
}

type EstadoHito = "hecho" | "ahora" | "fallo" | "pendiente";

/** Línea de tiempo de la solicitud: cuenta, envío, revisión y decisión. */
function LineaTiempo({ emisor, correo }: { emisor: Emisor; correo: string | null }) {
  const revision: EstadoHito =
    emisor.estado === "pendiente" || emisor.estado === "correcciones"
      ? "ahora"
      : emisor.estado === "autorizado"
        ? "hecho"
        : "fallo";
  const hitos: Array<{ titulo: string; detalle: ReactNode; estado: EstadoHito }> = [
    {
      titulo: "Cuenta creada y correo verificado",
      detalle: [formatearFecha(emisor.creadoEn), correo].filter(Boolean).join(" · "),
      estado: "hecho",
    },
    {
      titulo: "Solicitud enviada",
      detalle: (
        <>
          Folio <span className="font-mono">{folio(emisor)}</span>
        </>
      ),
      estado: "hecho",
    },
    {
      titulo:
        emisor.estado === "correcciones"
          ? "Correcciones solicitadas"
          : emisor.estado === "rechazado"
            ? "Solicitud rechazada"
            : "En revisión por el ente que autoriza",
      detalle:
        emisor.estado === "correcciones"
          ? "Corrija los datos indicados y reenvíe la solicitud."
          : emisor.estado === "rechazado"
            ? "El ente que autoriza no aprobó la solicitud."
            : "Verifica la identidad de la institución, del representante y el dominio del correo.",
      estado: revision,
    },
    {
      titulo: "Solicitud aceptada",
      detalle: "La institución queda habilitada para emitir credenciales verificables.",
      estado: emisor.estado === "autorizado" ? "hecho" : "pendiente",
    },
  ];
  return (
    <ol className="flex flex-col">
      {hitos.map((h, i) => (
        <li key={i} className="relative grid grid-cols-[26px_1fr] gap-3.5 pb-5 last:pb-0">
          {i < hitos.length - 1 && (
            <span
              aria-hidden
              className={cn("absolute bottom-0.5 left-3 top-[26px] w-0.5", h.estado === "hecho" ? "bg-sello" : "bg-linea")}
            />
          )}
          <span
            aria-hidden
            className={cn(
              "z-10 grid size-[26px] place-items-center rounded-full border-2 text-xs font-medium",
              h.estado === "hecho" && "border-sello bg-sello text-white",
              h.estado === "ahora" && "border-ambar bg-superficie text-ambar",
              h.estado === "fallo" && "border-lacre bg-superficie text-lacre",
              h.estado === "pendiente" && "border-linea bg-superficie text-tinta-tenue",
            )}
          >
            {h.estado === "hecho" ? (
              <Check className="size-3.5" strokeWidth={3} />
            ) : h.estado === "fallo" ? (
              <X className="size-3.5" strokeWidth={3} />
            ) : (
              i + 1
            )}
          </span>
          <span>
            <b className="block font-medium text-tinta">{h.titulo}</b>
            <span className="text-sm text-tinta-suave">{h.detalle}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Página de una sola columna centrada, como el diseño del portal. */
function Pagina({ titulo, insignia, children }: { titulo: string; insignia: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[684px] flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[1.625rem] font-bold leading-tight text-tec-azul">{titulo}</h1>
        {insignia}
      </div>
      {children}
    </div>
  );
}

function Nota({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-ambar-claro px-3.5 py-3 text-sm text-tinta">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

export function EmisorPendiente({ emisor }: { emisor: Emisor }) {
  const registro = useMiRegistro();
  const correo = registro?.institucion.correo ?? null;
  useRevisarPeriodicamente();
  return (
    <Pagina titulo="Su solicitud está en revisión" insignia={<Insignia tono="ambar">En revisión</Insignia>}>
      <p className="max-w-[62ch] text-tinta-suave">
        Recibimos la solicitud de <b className="font-medium text-tinta">{emisor.nombre}</b>. Para que la institución pueda
        emitir credenciales, falta que el ente que autoriza revise los datos y acepte la solicitud.
      </p>
      <div className="flex flex-col gap-6 rounded-xl border border-linea bg-superficie p-5 sm:p-6">
        <LineaTiempo emisor={emisor} correo={correo} />
        <Nota>
          {correo ? (
            <>
              Le avisaremos a <b className="font-medium">{correo}</b> cuando el ente que autoriza acepte la solicitud.
            </>
          ) : (
            "Le avisaremos cuando el ente que autoriza acepte la solicitud."
          )}{" "}
          No necesita hacer nada más por ahora.
        </Nota>
      </div>
    </Pagina>
  );
}

export function EmisorCorrecciones({ emisor }: { emisor: Emisor }) {
  const { api } = useSesion();
  const registro = useMiRegistro();
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [completo, setCompleto] = useState<Registro | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!corrigiendo) return;
    api.miRegistro().then(setCompleto, (e: unknown) =>
      setError(e instanceof Error ? e.message : "No se pudieron cargar los datos."),
    );
  }, [api, corrigiendo]);

  if (corrigiendo) {
    if (completo) return <RegistroEmisor correccion={completo} />;
    return error ? (
      <Aviso tipo="error" titulo="No se pudieron cargar los datos">
        {error}
      </Aviso>
    ) : (
      <Cargando texto="Cargando la solicitud" />
    );
  }

  return (
    <Pagina titulo="Su solicitud necesita correcciones" insignia={<Insignia tono="marino">Requiere correcciones</Insignia>}>
      <p className="max-w-[62ch] text-tinta-suave">
        El ente que autoriza revisó la solicitud de <b className="font-medium text-tinta">{emisor.nombre}</b> y pidió
        cambios antes de aprobarla.
      </p>
      <div className="flex flex-col gap-6 rounded-xl border border-linea bg-superficie p-5 sm:p-6">
        <LineaTiempo emisor={emisor} correo={registro?.institucion.correo ?? null} />
        <Aviso tipo="advertencia" titulo="Lo que hay que corregir">
          {emisor.motivoEstado ?? "El ente que autoriza no indicó un motivo."}
        </Aviso>
        <div>
          <Boton icono={<Pencil aria-hidden className="size-4" />} onClick={() => setCorrigiendo(true)}>
            Corregir y reenviar
          </Boton>
        </div>
      </div>
    </Pagina>
  );
}

export function EmisorRechazado({ emisor }: { emisor: Emisor }) {
  const registro = useMiRegistro();
  return (
    <Pagina titulo="Su solicitud fue rechazada" insignia={<Insignia tono="lacre">Rechazada</Insignia>}>
      <p className="max-w-[62ch] text-tinta-suave">
        <b className="font-medium text-tinta">{emisor.nombre}</b> no puede emitir credenciales con esta cuenta. Si cree
        que es un error, comuníquese con el ente que autoriza e indique el folio{" "}
        <span className="font-mono">{folio(emisor)}</span>.
      </p>
      <div className="flex flex-col gap-6 rounded-xl border border-linea bg-superficie p-5 sm:p-6">
        <LineaTiempo emisor={emisor} correo={registro?.institucion.correo ?? null} />
        <Aviso tipo="error" titulo="Motivo">
          {emisor.motivoEstado ?? "El ente que autoriza no indicó un motivo."}
        </Aviso>
      </div>
    </Pagina>
  );
}

export function EmisorSuspendido({ emisor }: { emisor: Emisor }) {
  useRevisarPeriodicamente();
  return (
    <Pagina titulo="La institución está suspendida" insignia={<Insignia tono="lacre">Suspendida</Insignia>}>
      <p className="max-w-[62ch] text-tinta-suave">
        Mientras dure la suspensión no puede emitir ni revocar credenciales. Las credenciales que ya emitió siguen en las
        wallets de sus titulares, pero la verificación indicará que la institución no está autorizada.
      </p>
      <Aviso tipo="error" titulo="Motivo de la suspensión">
        <p>{emisor.motivoEstado ?? "El ente que autoriza no indicó un motivo."}</p>
        {emisor.suspendidoEn && <p className="mt-1">Desde el {formatearFechaHora(emisor.suspendidoEn)}.</p>}
      </Aviso>
    </Pagina>
  );
}
