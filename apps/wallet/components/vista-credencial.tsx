"use client";

import type { CredencialEnBoveda } from "@repo/cliente";
import { Cargando, clasesBoton, Vacio } from "@repo/ui";
import { ChevronLeft, FileQuestion } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCredencial } from "../hooks/use-credencial";
import { AvisoError } from "./aviso-error";

export function EnlaceVolver({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={clasesBoton({ variante: "fantasma", tamano: "sm" }) + " -ml-3 self-start"}
    >
      <ChevronLeft aria-hidden className="size-4" />
      {children}
    </Link>
  );
}

/** Carga una credencial de la bóveda y resuelve los estados de carga y error. */
export function VistaCredencial({
  vcId,
  children,
}: {
  vcId: string;
  children: (credencial: CredencialEnBoveda) => ReactNode;
}) {
  const { estado, recargar } = useCredencial(vcId);

  if (estado.tipo === "cargando") return <Cargando texto="Cargando la credencial" />;
  if (estado.tipo === "error") {
    return (
      <div className="flex flex-col gap-4">
        <EnlaceVolver href="/">Tus credenciales</EnlaceVolver>
        <AvisoError
          titulo="No pudimos cargar la credencial"
          error={estado.error}
          alReintentar={recargar}
        />
      </div>
    );
  }
  if (estado.tipo === "no_encontrada") {
    return (
      <Vacio
        icono={<FileQuestion aria-hidden />}
        titulo="No encontramos esta credencial"
        accion={
          <Link href="/" className={clasesBoton({ variante: "secundario" })}>
            Ver tus credenciales
          </Link>
        }
      >
        Puede que el enlace esté incompleto o que la credencial no sea de esta wallet.
      </Vacio>
    );
  }
  return <>{children(estado.datos)}</>;
}
