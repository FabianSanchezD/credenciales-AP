"use client";

import type { Emisor } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Cargando, Marco } from "@repo/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { EmisorCorrecciones, EmisorPendiente, EmisorRechazado, EmisorSuspendido } from "./estado-emisor";
import { Ingreso } from "./ingreso";
import { MarcaTec } from "./marca-tec";
import { MenuPerfil } from "./menu-perfil";
import { RegistroEmisor } from "./registro-emisor";

const NAVEGACION = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/plantillas", etiqueta: "Plantillas" },
  { href: "/titulares", etiqueta: "Titulares" },
  { href: "/emitir", etiqueta: "Emitir" },
  { href: "/emisiones", etiqueta: "Emisiones" },
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
 * Decide qué ve la persona según su sesión: inicio de sesión con correo,
 * creación de la cuenta (/registro), revisión de la solicitud (pendiente,
 * correcciones o rechazada), suspensión o el portal completo.
 */
export function Acceso({ children }: { children: ReactNode }) {
  const { estado, sesion, cerrarSesion } = useSesion();
  const pathname = usePathname();
  const router = useRouter();
  const emisor = sesion?.emisor ?? null;
  const autorizado = emisor?.estado === "autorizado";

  const enlaces = autorizado
    ? NAVEGACION.map((enlace) => ({ ...enlace, activo: activo(pathname, enlace.href) }))
    : [];

  let contenido: ReactNode;
  if (estado === "cargando") {
    contenido = <Cargando texto="Revisando tu sesión" />;
  } else if (estado === "sin_sesion" || !sesion) {
    contenido = pathname.startsWith("/registro") ? <RegistroEmisor /> : <Ingreso />;
  } else if (!emisor) {
    // Sesión de una cuenta sin institución (p. ej. una sesión antigua con wallet).
    contenido = <RegistroEmisor />;
  } else if (emisor.estado === "pendiente") {
    contenido = <EmisorPendiente emisor={emisor} />;
  } else if (emisor.estado === "correcciones") {
    contenido = <EmisorCorrecciones emisor={emisor} />;
  } else if (emisor.estado === "rechazado") {
    contenido = <EmisorRechazado emisor={emisor} />;
  } else if (emisor.estado === "suspendido") {
    contenido = <EmisorSuspendido emisor={emisor} />;
  } else {
    contenido = <ContextoEmisor.Provider value={emisor}>{children}</ContextoEmisor.Provider>;
  }

  return (
    <Marco
      app="Portal del emisor"
      marca={<MarcaTec />}
      estiloNav="subrayado"
      ancho="amplio"
      enlaces={enlaces}
      usuario={sesion ? <MenuPerfil alCerrarSesion={() => void cerrarSesion().then(() => router.push("/"))} /> : undefined}
      componenteEnlace={Enlace}
    >
      {contenido}
    </Marco>
  );
}
