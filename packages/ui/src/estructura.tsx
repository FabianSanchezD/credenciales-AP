import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type TonoEstado = "sello" | "lacre" | "ambar" | "marino" | "neutro";

const TONOS: Record<TonoEstado, string> = {
  sello: "bg-sello-claro text-sello-hondo",
  lacre: "bg-lacre-claro text-lacre-hondo",
  ambar: "bg-ambar-claro text-ambar",
  marino: "bg-marino-claro text-marino",
  neutro: "bg-papel text-tinta-suave",
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
        "inline-flex items-center gap-[5px] self-center whitespace-nowrap rounded-full px-[9px] py-0.5 text-xs font-medium",
        TONOS[tono],
        className,
      )}
    >
      <span aria-hidden className="size-[7px] rounded-full bg-current" />
      {children}
    </span>
  );
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-panel border border-linea bg-superficie p-5", className)}
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
        <h1 className="text-2xl font-bold text-marino sm:text-[28px]">{titulo}</h1>
        {descripcion && <p className="mt-1.5 max-w-[62ch] text-tinta-suave">{descripcion}</p>}
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
  info: "border-marino-claro bg-hundido text-tinta",
  exito: "border-transparent bg-sello-claro text-tinta",
  advertencia: "border-transparent bg-ambar-claro text-tinta",
  error: "border-transparent bg-lacre-claro text-tinta",
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
      className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-3", TONOS_AVISO[tipo], className)}
    >
      <Icono aria-hidden className={cn("mt-0.5 size-[18px] shrink-0", COLOR_ICONO[tipo])} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        {titulo && <p className="font-medium">{titulo}</p>}
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
    <div className="flex flex-col items-center gap-3 rounded-panel border border-linea bg-superficie px-6 py-12 text-center">
      {icono && (
        <div className="grid size-14 place-items-center rounded-[14px] border border-linea bg-papel text-marino [&>svg]:size-6">
          {icono}
        </div>
      )}
      <h2 className="text-lg font-medium text-tinta">{titulo}</h2>
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
                  "grid size-7 shrink-0 place-items-center rounded-full border text-[12.5px] font-bold cifras",
                  hecho && "border-sello bg-sello-claro text-sello",
                  enCurso && "border-marino bg-marino text-white",
                  !hecho && !enCurso && "border-linea bg-superficie text-tinta-suave",
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
                enCurso ? "font-medium text-marino" : hecho ? "text-tinta-suave" : "text-tinta-tenue",
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
          <dt className="text-sm text-tinta-suave">{termino}</dt>
          <dd className="min-w-0 text-tinta">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
