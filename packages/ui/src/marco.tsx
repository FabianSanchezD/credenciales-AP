"use client";

import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { abreviar } from "./utilidades";

/** Marca institucional: logotipo TEC, divisor rojo y nombre del sistema. */
export function Marca({ app }: { app: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3 sm:gap-4">
      <span aria-label="TEC" className="font-marca text-[34px] leading-none tracking-[0.01em] text-marino">
        TEC
      </span>
      <span aria-hidden className="h-[30px] w-[1.5px] shrink-0 bg-rojo" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-base font-medium tracking-[0.01em] text-marino sm:text-[17px]">
          Credenciales Verificables
        </span>
        <span className="truncate text-xs text-tinta-suave">{app}</span>
      </span>
    </span>
  );
}

export interface EnlaceNav {
  href: string;
  etiqueta: string;
  activo?: boolean;
}

/**
 * Estructura común de las cuatro web apps: barra superior con marca,
 * navegación y cuenta, y un área de contenido de ancho legible.
 */
export function Marco({
  app,
  enlaces = [],
  cuenta,
  alCerrarSesion,
  componenteEnlace: Enlace = "a",
  ancho = "amplio",
  children,
}: {
  app: string;
  enlaces?: EnlaceNav[];
  /** Cuenta `G...` en sesión. */
  cuenta?: string | null;
  alCerrarSesion?: () => void;
  componenteEnlace?: "a" | React.ComponentType<{ href: string; className?: string; children: ReactNode; "aria-current"?: "page" }>;
  ancho?: "angosto" | "amplio";
  children: ReactNode;
}) {
  const contenedor = ancho === "angosto" ? "max-w-3xl" : "max-w-6xl";
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-superficie focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-linea bg-superficie">
        <div className={cn("mx-auto flex min-h-[68px] items-center gap-4 px-4 py-3 sm:px-6", contenedor)}>
          <Enlace href="/" className="min-w-0 shrink rounded-control">
            <Marca app={app} />
          </Enlace>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {enlaces.length > 0 && (
              <nav aria-label="Principal" className="hidden items-center gap-0.5 md:flex">
                {enlaces.map((enlace) => (
                  <Enlace
                    key={enlace.href}
                    href={enlace.href}
                    aria-current={enlace.activo ? "page" : undefined}
                    className={cn(
                      "px-2.5 py-[7px] text-sm transition-colors",
                      enlace.activo
                        ? "font-medium text-marino shadow-[inset_0_-2px_0_var(--color-marino)]"
                        : "rounded-md text-tinta-suave hover:text-marino",
                    )}
                  >
                    {enlace.etiqueta}
                  </Enlace>
                ))}
              </nav>
            )}
            {cuenta && (
              <span
                title={cuenta}
                className="hidden items-center gap-2.5 rounded-[10px] border border-linea bg-superficie p-[5px] sm:inline-flex lg:pr-2.5"
              >
                <span
                  aria-hidden
                  className="grid size-[30px] place-items-center rounded-lg bg-marino text-[13px] font-medium text-white"
                >
                  {cuenta.slice(0, 1)}
                </span>
                <span className="hidden flex-col leading-tight lg:flex">
                  <code className="font-mono text-[12.5px] text-tinta">{abreviar(cuenta)}</code>
                  <span className="flex items-center gap-1 text-[11.5px] text-tinta-suave">
                    <span aria-hidden className="size-1.5 rounded-full bg-sello" />
                    Conectada
                  </span>
                </span>
              </span>
            )}
            {alCerrarSesion && (
              <button
                type="button"
                onClick={alCerrarSesion}
                className="inline-flex h-9 items-center gap-1.5 rounded-control px-2.5 text-sm text-lacre hover:bg-lacre-claro"
              >
                <LogOut aria-hidden className="size-4" />
                <span>Salir</span>
              </button>
            )}
          </div>
        </div>
        {enlaces.length > 0 && (
          <nav aria-label="Principal móvil" className="flex gap-1 overflow-x-auto border-t border-linea px-3 md:hidden">
            {enlaces.map((enlace) => (
              <Enlace
                key={enlace.href}
                href={enlace.href}
                aria-current={enlace.activo ? "page" : undefined}
                className={cn(
                  "shrink-0 px-3 py-2.5 text-sm",
                  enlace.activo
                    ? "font-medium text-marino shadow-[inset_0_-2px_0_var(--color-marino)]"
                    : "text-tinta-suave",
                )}
              >
                {enlace.etiqueta}
              </Enlace>
            ))}
          </nav>
        )}
      </header>
      <main id="contenido" className={cn("mx-auto w-full flex-1 px-4 pb-14 pt-8 sm:px-6", contenedor)}>
        {children}
      </main>
      <footer className="border-t border-linea bg-superficie">
        <div className={cn("mx-auto flex flex-wrap justify-between gap-x-6 gap-y-2 px-4 py-4 text-[12.5px] text-tinta-suave sm:px-6", contenedor)}>
          <span>Credenciales verificables sobre Stellar. Prueba de concepto para Don Rufino.</span>
          <span>Ningún dato personal se guarda en la blockchain.</span>
        </div>
      </footer>
    </div>
  );
}
