"use client";

import { useSesion } from "@repo/cliente/react";
import { Cargando, Marco } from "@repo/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { InicioSesion } from "./inicio-sesion";
import { useTitular } from "./titular";

function activo(ruta: string, href: string): boolean {
  if (href === "/") return ruta === "/" || ruta.startsWith("/credenciales");
  return ruta.startsWith(href);
}

/**
 * Estructura de la wallet. Sin sesión muestra el inicio de sesión en
 * cualquier ruta; al entrar, el titular sigue en la página que abrió.
 */
export function MarcoWallet({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const router = useRouter();
  const { estado, sesion } = useSesion();
  const { salir } = useTitular();
  const activa = estado === "activa" && sesion !== null;

  const enlaces = activa
    ? [
        { href: "/", etiqueta: "Credenciales" },
        { href: "/emisores", etiqueta: "Instituciones" },
        { href: "/cuenta", etiqueta: "Cuenta" },
      ].map((enlace) => ({ ...enlace, activo: activo(ruta, enlace.href) }))
    : [];

  return (
    <Marco
      app="Digital Wallet"
      ancho="angosto"
      componenteEnlace={Link}
      enlaces={enlaces}
      cuenta={activa ? sesion.address : null}
      alCerrarSesion={
        activa
          ? () => {
              void salir().then(() => router.push("/"));
            }
          : undefined
      }
    >
      {estado === "cargando" ? (
        <Cargando texto="Abriendo tu wallet" />
      ) : activa ? (
        children
      ) : (
        <InicioSesion />
      )}
    </Marco>
  );
}
