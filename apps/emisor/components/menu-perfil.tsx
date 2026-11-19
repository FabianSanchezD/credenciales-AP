"use client";

import { useSesion } from "@repo/cliente/react";
import { abreviar, cn } from "@repo/ui";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useMiRegistro } from "../lib/use-mi-registro";

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * Botón de perfil del header: iniciales, representante e institución, con un
 * menú para la configuración (solo autorizada) y cerrar sesión.
 */
export function MenuPerfil({ alCerrarSesion }: { alCerrarSesion: () => void }) {
  const { sesion } = useSesion();
  const registro = useMiRegistro();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const idMenu = useId();

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  if (!sesion) return null;
  const emisor = sesion.emisor;
  const nombre = registro?.representante.nombre ?? emisor?.nombre ?? abreviar(sesion.address);
  const institucion = emisor?.nombre ?? "Institución sin registrar";
  const correo = registro?.institucion.correo ?? abreviar(sesion.address);

  return (
    <div ref={contenedor} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => setAbierto((v) => !v)}
        className="flex max-w-[280px] items-center gap-2.5 rounded-[10px] py-1 pl-1 pr-2 text-left hover:bg-hundido"
      >
        <span aria-hidden className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-tec-azul text-[13px] font-medium text-white">
          {iniciales(nombre)}
        </span>
        <span className="hidden min-w-0 flex-col leading-tight sm:flex">
          <b className="truncate text-[13.5px] font-medium text-tinta">{nombre}</b>
          <span className="truncate text-xs text-tinta-suave">{institucion}</span>
        </span>
        <ChevronDown aria-hidden className={cn("size-3.5 shrink-0 text-tinta-tenue transition-transform", abierto && "rotate-180")} />
      </button>
      {abierto && (
        <div
          id={idMenu}
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-60 rounded-[10px] border border-linea bg-superficie p-1.5 shadow-[0_12px_32px_rgba(0,20,50,0.12)]"
        >
          <div className="mb-1.5 flex flex-col gap-0.5 border-b border-linea px-2.5 pb-3 pt-2.5">
            <b className="text-sm font-medium text-tinta">{nombre}</b>
            <span className="break-all text-[12.5px] text-tinta-suave">{correo}</span>
          </div>
          {emisor?.estado === "autorizado" && (
            <Link
              href="/institucion"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex items-center gap-2.5 rounded-md p-2.5 text-sm text-tinta hover:bg-hundido"
            >
              <Settings aria-hidden className="size-4" />
              Configuración
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAbierto(false);
              alCerrarSesion();
            }}
            className="flex w-full items-center gap-2.5 rounded-md p-2.5 text-left text-sm text-lacre hover:bg-hundido"
          >
            <LogOut aria-hidden className="size-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
