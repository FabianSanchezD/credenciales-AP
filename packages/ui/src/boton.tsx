import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type VarianteBoton = "primario" | "secundario" | "fantasma" | "peligro";

const VARIANTES: Record<VarianteBoton, string> = {
  primario:
    "bg-accion text-superficie hover:bg-accion-hover disabled:bg-linea-fuerte disabled:text-superficie",
  secundario:
    "bg-superficie text-tinta border border-linea-fuerte hover:border-tinta hover:bg-hundido",
  fantasma: "text-tinta-suave hover:text-tinta hover:bg-hundido",
  peligro: "bg-lacre text-white hover:bg-lacre-hondo",
};

const TAMANOS = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-[0.9375rem] gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  tamano?: keyof typeof TAMANOS;
  cargando?: boolean;
  icono?: ReactNode;
  anchoCompleto?: boolean;
}

export function clasesBoton({
  variante = "primario",
  tamano = "md",
  anchoCompleto = false,
}: Pick<PropsBoton, "variante" | "tamano" | "anchoCompleto"> = {}): string {
  return cn(
    "inline-flex select-none items-center justify-center rounded-control font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-70",
    VARIANTES[variante],
    TAMANOS[tamano],
    anchoCompleto && "w-full",
  );
}

export function Boton({
  variante,
  tamano,
  cargando = false,
  icono,
  anchoCompleto,
  className,
  children,
  disabled,
  type = "button",
  ...resto
}: PropsBoton) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={cn(clasesBoton({ variante, tamano, anchoCompleto }), className)}
      {...resto}
    >
      {cargando ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : icono}
      {children}
    </button>
  );
}
