"use client";

import type { EstadoEmision } from "@repo/cliente";
import { Aviso, Boton, Insignia, clasesBoton, cn, type PropsBoton } from "@repo/ui";
import { ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ETIQUETAS_ESTADO_EMISION, TONOS_ESTADO_EMISION, enlaceTransaccion } from "../lib/emisiones";

export function InsigniaEmision({ estado }: { estado: EstadoEmision }) {
  return <Insignia tono={TONOS_ESTADO_EMISION[estado]}>{ETIQUETAS_ESTADO_EMISION[estado]}</Insignia>;
}

/** Error al cargar datos: dice qué pasó y ofrece reintentar. */
export function ErrorCarga({
  titulo = "No se pudieron cargar los datos",
  mensaje,
  alReintentar,
}: {
  titulo?: string;
  mensaje: string;
  alReintentar: () => void;
}) {
  return (
    <Aviso
      tipo="error"
      titulo={titulo}
      accion={
        <Boton
          tamano="sm"
          variante="secundario"
          icono={<RefreshCw aria-hidden className="size-4" />}
          onClick={alReintentar}
        >
          Intentar de nuevo
        </Boton>
      }
    >
      {mensaje} Si el problema sigue, revisa que la API esté disponible.
    </Aviso>
  );
}

/** Enlace interno con aspecto de botón. */
export function EnlaceBoton({
  href,
  children,
  icono,
  variante = "primario",
  tamano = "md",
  className,
}: {
  href: string;
  children: ReactNode;
  icono?: ReactNode;
  variante?: PropsBoton["variante"];
  tamano?: PropsBoton["tamano"];
  className?: string;
}) {
  return (
    <Link href={href} className={cn(clasesBoton({ variante, tamano }), className)}>
      {icono}
      {children}
    </Link>
  );
}

/** Enlace a la transacción en stellar.expert, en una pestaña nueva. */
export function EnlaceTransaccion({ txHash, children }: { txHash: string; children?: ReactNode }) {
  return (
    <a
      href={enlaceTransaccion(txHash)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-marino underline decoration-marino/30 underline-offset-2 hover:decoration-marino"
    >
      {children ?? "Ver en stellar.expert"}
      <ExternalLink aria-hidden className="size-3.5" />
      <span className="sr-only">(se abre en una pestaña nueva)</span>
    </a>
  );
}

export function EnlaceTexto({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-marino underline decoration-marino/30 underline-offset-2 hover:decoration-marino"
    >
      {children}
    </Link>
  );
}
