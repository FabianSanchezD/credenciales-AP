"use client";

import { Check, Copy, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";

/** `GABC…WXYZ`, con el valor completo en el título. */
export function abreviar(texto: string, inicio = 6, fin = 4): string {
  return texto.length <= inicio + fin + 1 ? texto : `${texto.slice(0, inicio)}…${texto.slice(-fin)}`;
}

export function BotonCopiar({
  valor,
  etiqueta = "Copiar",
  className,
}: {
  valor: string;
  etiqueta?: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 1800);
    return () => clearTimeout(t);
  }, [copiado]);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(valor).then(() => setCopiado(true));
      }}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-tinta-suave transition-colors hover:bg-hundido hover:text-tinta",
        className,
      )}
    >
      {copiado ? <Check aria-hidden className="size-4 text-sello" /> : <Copy aria-hidden className="size-4" />}
      <span aria-live="polite">{copiado ? "Copiado" : etiqueta}</span>
    </button>
  );
}

/** Identificador largo (DID, cuenta, hash) abreviado y copiable. */
export function Identificador({ valor, etiqueta }: { valor: string; etiqueta?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-control bg-hundido py-0.5 pl-2.5 pr-0.5">
      <code title={valor} className="truncate font-mono text-[0.8125rem] text-tinta">
        {abreviar(valor, valor.startsWith("did:") ? 22 : 8, 6)}
      </code>
      <BotonCopiar valor={valor} etiqueta={etiqueta ?? "Copiar"} className="h-7 px-2 [&>span]:sr-only" />
    </span>
  );
}

export function CodigoQR({ valor, tamano = 224 }: { valor: string; tamano?: number }) {
  return (
    <div className="inline-block rounded-panel border border-linea bg-white p-3">
      <QRCodeSVG value={valor} size={tamano} level="L" marginSize={0} fgColor="#17233b" bgColor="#ffffff" />
    </div>
  );
}

/** Diálogo modal nativo (`<dialog>`), con foco atrapado y cierre con Escape. */
export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  children,
  acciones,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: ReactNode;
  descripcion?: ReactNode;
  children?: ReactNode;
  acciones?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);
  return (
    <dialog
      ref={ref}
      onClose={alCerrar}
      onClick={(e) => {
        if (e.target === ref.current) alCerrar();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-documento border border-linea bg-superficie p-0 text-tinta shadow-flotante backdrop:bg-tinta/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{titulo}</h2>
            {descripcion && <p className="mt-1 text-sm text-tinta-suave">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={alCerrar}
            className="-m-1 rounded-control p-1 text-tinta-tenue hover:bg-hundido hover:text-tinta"
          >
            <X aria-hidden className="size-5" />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>
        {children}
        {acciones && <div className="flex flex-wrap justify-end gap-2 pt-2">{acciones}</div>}
      </div>
    </dialog>
  );
}
