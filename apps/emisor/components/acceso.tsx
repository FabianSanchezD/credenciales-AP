"use client";

import type { Emisor } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Cargando, Marco, PanelConexion, type PresentacionConexion } from "@repo/ui";
import { Eye, FingerprintPattern, Lock, PenLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { env } from "../lib/env";
import { CLAVE_DEMO } from "../lib/use-firmante";
import { EmisorPendiente, EmisorSuspendido } from "./estado-emisor";
import { RegistroEmisor } from "./registro-emisor";

const NAVEGACION = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/emitir", etiqueta: "Emitir" },
  { href: "/emisiones", etiqueta: "Emisiones" },
  { href: "/plantillas", etiqueta: "Plantillas" },
  { href: "/titulares", etiqueta: "Titulares" },
  { href: "/institucion", etiqueta: "Institución" },
];

function Enlace({
  href,
  className,
  children,
  "aria-current": actual,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page";
}) {
  return (
    <Link href={href} className={className} aria-current={actual}>
      {children}
    </Link>
  );
}

const PRESENTACION: PresentacionConexion = {
  antetitulo: "Instituciones emisoras",
  titulo: "Credenciales con respaldo verificable",
  descripcion:
    "Cada credencial lleva la firma de la institución y una huella registrada en una red pública. Si alguien altera un solo dato, la verificación lo detecta.",
  rasgos: [
    { icono: PenLine, titulo: "Firma digital", texto: "De la institución, en cada emisión." },
    { icono: FingerprintPattern, titulo: "Huella inalterable", texto: "Anclada en Stellar, consultable por cualquiera." },
    { icono: Eye, titulo: "Divulgación selectiva", texto: "El titular decide qué datos mostrar." },
    { icono: Lock, titulo: "Emisores validados", texto: "Solo instituciones aprobadas pueden emitir." },
  ],
};

const ContextoEmisor = createContext<Emisor | null>(null);

/** Emisor autorizado en sesión. Solo existe dentro del portal. */
export function useEmisor(): Emisor {
  const emisor = useContext(ContextoEmisor);
  if (!emisor) throw new Error("useEmisor solo funciona con un emisor autorizado en sesión");
  return emisor;
}

function activo(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Decide qué ve la persona según su sesión: conexión, registro de la
 * institución, espera de autorización, suspensión o el portal completo.
 */
export function Acceso({ children }: { children: ReactNode }) {
  const { estado, sesion, cerrarSesion } = useSesion();
  const pathname = usePathname();
  const emisor = sesion?.emisor ?? null;
  const autorizado = emisor?.estado === "autorizado";

  const enlaces = autorizado
    ? NAVEGACION.map((enlace) => ({ ...enlace, activo: activo(pathname, enlace.href) }))
    : [];

  let contenido: ReactNode;
  if (estado === "cargando") {
    contenido = <Cargando texto="Revisando tu sesión" />;
  } else if (estado === "sin_sesion" || !sesion) {
    contenido = (
      <PanelConexion
        titulo="Portal del emisor"
        descripcion="Entra con la cuenta de Stellar de tu institución para crear plantillas, emitir credenciales firmadas y revocarlas cuando haga falta."
        network={env.stellarNetwork}
        horizonUrl={env.stellarHorizonUrl}
        claveDemo={CLAVE_DEMO}
        presentacion={PRESENTACION}
        pie={
          <p className="text-sm text-tinta-tenue">
            Si tu institución todavía no está registrada, podrás registrarla después de entrar.
          </p>
        }
      />
    );
  } else if (!emisor) {
    contenido = <RegistroEmisor />;
  } else if (emisor.estado === "pendiente") {
    contenido = <EmisorPendiente emisor={emisor} />;
  } else if (emisor.estado === "suspendido") {
    contenido = <EmisorSuspendido emisor={emisor} />;
  } else {
    contenido = <ContextoEmisor.Provider value={emisor}>{children}</ContextoEmisor.Provider>;
  }

  return (
    <Marco
      app="Portal del emisor"
      ancho="amplio"
      enlaces={enlaces}
      cuenta={sesion?.address ?? null}
      alCerrarSesion={sesion ? () => void cerrarSesion() : undefined}
      componenteEnlace={Enlace}
    >
      {contenido}
    </Marco>
  );
}
