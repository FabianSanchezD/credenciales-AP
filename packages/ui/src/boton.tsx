import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type VarianteBoton = "primario" | "secundario" | "fantasma" | "peligro";

const VARIANTES: Record<VarianteBoton, string> = {
  primario: "border border-marino bg-marino text-white hover:border-marino-hondo hover:bg-marino-hondo",
  secundario: "bg-superficie text-tinta border border-linea hover:border-marino",
  fantasma: "border border-transparent text-marino hover:bg-hundido",
  peligro: "bg-superficie text-lacre border border-rojo hover:bg-lacre-claro",
};

const TAMANOS = {
  sm: "min-h-8 px-3 text-[13px] gap-1.5",
  md: "min-h-11 px-[18px] text-[14.5px] gap-2",
  lg: "min-h-12 px-5 text-[15px] gap-2",
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
    "inline-flex select-none items-center justify-center rounded-control font-medium transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-45",
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
