import { ChevronDown } from "lucide-react";
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";

const CONTROL =
  "w-full rounded-control border border-linea bg-superficie px-3 text-tinta placeholder:text-tinta-tenue " +
  "transition-colors hover:border-linea-fuerte focus:border-marino focus:outline-none focus:ring-2 focus:ring-marino/20 " +
  "aria-[invalid=true]:border-rojo disabled:bg-papel disabled:text-tinta-tenue";

interface PropsCampo {
  etiqueta: string;
  ayuda?: ReactNode;
  error?: string | null;
  opcional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
}

/** Etiqueta, ayuda y error accesibles alrededor de un control. */
export function Campo({ etiqueta, ayuda, error, opcional, className, children }: PropsCampo) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const descritoPor = [ayuda && idAyuda, error && idError].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13.5px] font-medium text-tinta">
        {etiqueta}
        {opcional && <span className="ml-1.5 font-normal text-tinta-tenue">(opcional)</span>}
      </label>
      {children({ id, "aria-describedby": descritoPor, "aria-invalid": error ? true : undefined })}
      {ayuda && !error && (
        <p id={idAyuda} className="text-[12.5px] text-tinta-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-[12.5px] text-lacre">
          {error}
        </p>
      )}
    </div>
  );
}

export function Entrada({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, "h-11", className)} {...props} />;
}

export function AreaTexto({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-[90px] resize-y py-2.5 leading-relaxed", className)} {...props} />;
}

export function Selector({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select className={cn(CONTROL, "h-11 appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-tinta-tenue"
      />
    </span>
  );
}

interface PropsCasilla extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  etiqueta: ReactNode;
  descripcion?: ReactNode;
}

export function Casilla({ etiqueta, descripcion, className, ...props }: PropsCasilla) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-control border border-linea bg-superficie p-3 transition-colors",
        "hover:border-marino has-[:checked]:border-marino has-[:checked]:shadow-[inset_0_0_0_1px_var(--color-marino)]",
        className,
      )}
    >
      <input id={id} type="checkbox" className="mt-0.5 size-[18px] shrink-0 accent-[var(--color-marino)]" {...props} />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-tinta">{etiqueta}</span>
        {descripcion && <span className="text-sm text-tinta-suave">{descripcion}</span>}
      </span>
    </label>
  );
}
