import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type TonoEstado = "sello" | "lacre" | "ambar" | "marino" | "neutro";

const TONOS: Record<TonoEstado, string> = {
  sello: "bg-sello-claro text-sello-hondo",
  lacre: "bg-lacre-claro text-lacre-hondo",
  ambar: "bg-ambar-claro text-ambar",
  marino: "bg-marino-claro text-marino",
  neutro: "bg-hundido text-tinta-suave",
};

/** Etiqueta corta de estado (válida, pendiente, revocada...). */
export function Insignia({
  tono = "neutro",
  children,
  className,
}: {
  tono?: TonoEstado;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold",
        TONOS[tono],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-panel border border-linea bg-superficie p-5 sm:p-6", className)}
      {...props}
    />
  );
}

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-tinta sm:text-[1.75rem]">{titulo}</h1>
        {descripcion && <p className="mt-1.5 text-tinta-suave">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

const ICONOS_AVISO = {
  info: Info,
  exito: CircleCheck,
  advertencia: TriangleAlert,
  error: CircleAlert,
};

const TONOS_AVISO = {
  info: "border-marino/30 bg-marino-claro text-tinta",
  exito: "border-sello/30 bg-sello-claro text-tinta",
  advertencia: "border-ambar/30 bg-ambar-claro text-tinta",
  error: "border-lacre/30 bg-lacre-claro text-tinta",
};

const COLOR_ICONO = {
  info: "text-marino",
  exito: "text-sello",
  advertencia: "text-ambar",
  error: "text-lacre",
};

export function Aviso({
  tipo = "info",
  titulo,
  children,
  accion,
  className,
}: {
  tipo?: keyof typeof ICONOS_AVISO;
  titulo?: ReactNode;
  children?: ReactNode;
  accion?: ReactNode;
  className?: string;
}) {
  const Icono = ICONOS_AVISO[tipo];
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-panel border p-4", TONOS_AVISO[tipo], className)}
    >
      <Icono aria-hidden className={cn("mt-0.5 size-5 shrink-0", COLOR_ICONO[tipo])} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className="text-tinta-suave">{children}</div>}
        {accion && <div className="mt-2">{accion}</div>}
      </div>
    </div>
  );
}

/** Pantalla vacía: siempre invita a la siguiente acción. */
export function Vacio({
  icono,
  titulo,
  children,
  accion,
}: {
  icono?: ReactNode;
  titulo: ReactNode;
  children?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-panel border border-dashed border-linea-fuerte bg-superficie/60 px-6 py-10 sm:items-center sm:text-center">
      {icono && <div className="text-tinta-tenue [&>svg]:size-8">{icono}</div>}
      <h2 className="text-lg font-semibold text-tinta">{titulo}</h2>
      {children && <div className="max-w-md text-tinta-suave">{children}</div>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

export function Cargando({ texto = "Cargando" }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center gap-2.5 py-10 text-tinta-suave">
      <LoaderCircle aria-hidden className="size-5 animate-spin" />
      <span>{texto}</span>
    </div>
  );
}

/** Pasos de un proceso secuencial (p. ej. preparar, firmar, anclar). */
export function Pasos({
  pasos,
  actual,
}: {
  pasos: string[];
  /** Índice del paso en curso; `pasos.length` cuando terminó todo. */
  actual: number;
}) {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:gap-0">
      {pasos.map((paso, i) => {
        const hecho = i < actual;
        const enCurso = i === actual;
        return (
          <li key={paso} className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            <div className="flex w-full items-center">
              <span
                aria-hidden
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold cifras",
                  hecho && "border-sello bg-sello text-superficie",
                  enCurso && "border-tinta bg-superficie text-tinta",
                  !hecho && !enCurso && "border-linea-fuerte bg-superficie text-tinta-tenue",
                )}
              >
                {hecho ? "✓" : i + 1}
              </span>
              {i < pasos.length - 1 && (
                <span
                  aria-hidden
                  className={cn("mx-2 hidden h-0.5 flex-1 sm:block", hecho ? "bg-sello" : "bg-linea")}
                />
              )}
            </div>
            <span
              className={cn(
                "text-sm",
                enCurso ? "font-semibold text-tinta" : hecho ? "text-tinta-suave" : "text-tinta-tenue",
              )}
            >
              {paso}
              <span className="sr-only">{hecho ? " (completado)" : enCurso ? " (en curso)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Lista de términos y valores, p. ej. los datos de una credencial. */
export function ListaDatos({
  datos,
  className,
}: {
  datos: Array<{ termino: ReactNode; valor: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(8rem,auto)_1fr]", className)}>
      {datos.map(({ termino, valor }, i) => (
        <div key={i} className="contents">
          <dt className="text-sm text-tinta-tenue">{termino}</dt>
          <dd className="min-w-0 text-tinta">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
