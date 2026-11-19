"use client";

import { useSesion } from "@repo/cliente/react";
import { Cargando, Marco } from "@repo/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ConexionGobernanza } from "./conexion";

function Enlace(props: {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page";
}) {
  return <Link {...props} />;
}

/** Marco de la consola: pide sesión antes de mostrar cualquier página. */
export function Consola({ children }: { children: ReactNode }) {
  const { estado, sesion, cerrarSesion } = useSesion();
  const ruta = usePathname();
  const activa = estado === "activa" && sesion !== null;

  const enlaces = activa
    ? [
        { href: "/", etiqueta: "Resumen", activo: ruta === "/" },
        { href: "/emisores", etiqueta: "Instituciones", activo: ruta.startsWith("/emisores") },
      ]
    : [];

  return (
    <Marco
      app="Consola de gobernanza"
      ancho="amplio"
      componenteEnlace={Enlace}
      enlaces={enlaces}
      cuenta={activa ? sesion.address : null}
      alCerrarSesion={activa ? () => void cerrarSesion() : undefined}
    >
      {estado === "cargando" ? (
        <Cargando texto="Revisando la sesión" />
      ) : activa ? (
        children
      ) : (
        <ConexionGobernanza />
      )}
    </Marco>
  );
}
