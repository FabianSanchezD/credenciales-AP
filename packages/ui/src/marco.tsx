"use client";

import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { abreviar } from "./utilidades";

/** Marca de la plataforma: un sello mínimo y el nombre. */
export function Marca({ app }: { app: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-7 -rotate-[8deg] text-sello" aria-hidden>
        <circle cx="16" cy="16" r="14" fill="currentColor" opacity="0.14" />
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="9.5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1.6" />
        <path d="M11.5 16.5 L14.8 19.6 L20.8 13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[0.9375rem] font-bold text-tinta">Credenciales AP</span>
        <span className="mt-1 text-xs font-medium text-tinta-tenue">{app}</span>
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
      <header className="sticky top-0 z-30 border-b border-linea bg-niebla/90 backdrop-blur">
        <div className={cn("mx-auto flex h-16 items-center gap-6 px-4 sm:px-6", contenedor)}>
          <Enlace href="/" className="shrink-0 rounded-control">
            <Marca app={app} />
          </Enlace>
          {enlaces.length > 0 && (
            <nav aria-label="Principal" className="hidden flex-1 items-center gap-1 md:flex">
              {enlaces.map((enlace) => (
                <Enlace
                  key={enlace.href}
                  href={enlace.href}
                  aria-current={enlace.activo ? "page" : undefined}
                  className={cn(
                    "rounded-control px-3 py-2 text-sm font-medium transition-colors",
                    enlace.activo ? "bg-superficie text-tinta shadow-[inset_0_0_0_1px_var(--color-linea)]" : "text-tinta-suave hover:text-tinta",
                  )}
                >
                  {enlace.etiqueta}
                </Enlace>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-2">
            {cuenta && (
              <span
                title={cuenta}
                className="hidden items-center gap-2 rounded-full border border-linea bg-superficie py-1 pl-2 pr-3 text-sm sm:inline-flex"
              >
                <span aria-hidden className="size-2 rounded-full bg-sello" />
                <code className="font-mono text-[0.8125rem] text-tinta-suave">{abreviar(cuenta)}</code>
              </span>
            )}
            {alCerrarSesion && (
              <button
                type="button"
                onClick={alCerrarSesion}
                className="inline-flex h-9 items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-tinta-suave hover:bg-hundido hover:text-tinta"
              >
                <LogOut aria-hidden className="size-4" />
                <span>Salir</span>
              </button>
            )}
          </div>
        </div>
        {enlaces.length > 0 && (
          <nav aria-label="Principal móvil" className="flex gap-1 overflow-x-auto border-t border-linea px-3 py-2 md:hidden">
            {enlaces.map((enlace) => (
              <Enlace
                key={enlace.href}
                href={enlace.href}
                aria-current={enlace.activo ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-control px-3 py-1.5 text-sm font-medium",
                  enlace.activo ? "bg-superficie text-tinta" : "text-tinta-suave",
                )}
              >
                {enlace.etiqueta}
              </Enlace>
            ))}
          </nav>
        )}
      </header>
      <main id="contenido" className={cn("mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-10", contenedor)}>
        {children}
      </main>
      <footer className="border-t border-linea">
        <div className={cn("mx-auto flex flex-col gap-1 px-4 py-6 text-sm text-tinta-tenue sm:flex-row sm:justify-between sm:px-6", contenedor)}>
          <span>Credenciales verificables sobre Stellar. Prueba de concepto para Don Rufino.</span>
          <span>Ningún dato personal se guarda en la blockchain.</span>
        </div>
      </footer>
    </div>
  );
}
