"use client";

import { conectarWalletStellar, crearFirmanteDemo, type Firmante } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import type { StellarNetwork } from "@repo/stellar";
import { FlaskConical, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import { useState, type ReactNode } from "react";
import { Boton } from "./boton";
import { cn } from "./cn";
import { Aviso } from "./estructura";

export interface PresentacionConexion {
  /** Etiqueta corta en mayúsculas, en rojo. */
  antetitulo: string;
  titulo: ReactNode;
  descripcion: ReactNode;
  rasgos: Array<{ icono: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; titulo: string; texto: string }>;
}

/** Columna izquierda del inicio de sesión: qué es la plataforma y por qué confiar en ella. */
function Lateral({ presentacion }: { presentacion: PresentacionConexion }) {
  return (
    <div className="relative flex flex-col gap-6 overflow-hidden border-b border-linea bg-papel p-6 sm:p-10 md:border-b-0 md:border-r">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(var(--color-linea)_1px,transparent_1px)] [background-size:14px_14px]"
      />
      <div className="relative flex flex-col gap-3">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-lacre">{presentacion.antetitulo}</p>
        <h2 className="text-[28px] font-bold leading-tight text-marino">{presentacion.titulo}</h2>
        <p className="max-w-[46ch] text-tinta-suave">{presentacion.descripcion}</p>
      </div>
      <ul className="relative grid gap-x-[18px] gap-y-3.5 sm:grid-cols-2">
        {presentacion.rasgos.map(({ icono: Icono, titulo, texto }, i) => (
          <li key={titulo} className="grid grid-cols-[34px_1fr] items-start gap-2.5 text-[13.5px] text-tinta-suave">
            <span
              className={cn(
                "grid size-[34px] place-items-center rounded-lg border border-linea bg-superficie",
                i === 1 ? "text-lacre" : "text-marino",
              )}
            >
              <Icono aria-hidden className="size-4" />
            </span>
            <span>
              <b className="block text-sm font-medium text-tinta">{titulo}</b>
              {texto}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function mensaje(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "No se pudo completar la conexión. Intenta de nuevo.";
}

/**
 * Inicio de sesión con una wallet de Stellar (Freighter, xBull, Albedo...) o,
 * en testnet, con una cuenta demo guardada en este navegador. La wallet firma
 * un desafío; la llave nunca sale del dispositivo.
 */
export function PanelConexion({
  titulo,
  descripcion,
  network,
  claveDemo,
  horizonUrl,
  pie,
  presentacion,
}: {
  titulo: ReactNode;
  descripcion: ReactNode;
  network: StellarNetwork;
  /** Clave de localStorage para la cuenta demo de esta app. */
  claveDemo: string;
  horizonUrl?: string;
  pie?: ReactNode;
  /** Con presentación, el acceso se muestra como tarjeta de dos columnas. */
  presentacion?: PresentacionConexion;
}) {
  const { iniciarSesion } = useSesion();
  const [enCurso, setEnCurso] = useState<"wallet" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function conectar(tipo: "wallet" | "demo") {
    setEnCurso(tipo);
    setError(null);
    try {
      const firmante: Firmante =
        tipo === "wallet"
          ? await conectarWalletStellar(network)
          : await crearFirmanteDemo({ clave: claveDemo, network, horizonUrl });
      await iniciarSesion(firmante);
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setEnCurso(null);
    }
  }

  const formulario = (
    <div className={cn("flex flex-col gap-[18px]", presentacion ? "p-6 sm:p-10" : "mx-auto max-w-md py-6 sm:py-12")}>
      <div>
        <h1 className="text-[28px] font-bold leading-tight text-marino">{titulo}</h1>
        <p className="mt-2 text-tinta-suave">{descripcion}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Boton
          tamano="lg"
          anchoCompleto
          icono={<Wallet aria-hidden className="size-5" />}
          cargando={enCurso === "wallet"}
          disabled={enCurso !== null}
          onClick={() => void conectar("wallet")}
        >
          Conectar wallet de Stellar
        </Boton>
        {network === "testnet" && (
          <Boton
            tamano="lg"
            variante="secundario"
            anchoCompleto
            icono={<FlaskConical aria-hidden className="size-5" />}
            cargando={enCurso === "demo"}
            disabled={enCurso !== null}
            onClick={() => void conectar("demo")}
          >
            Usar cuenta demo de testnet
          </Boton>
        )}
      </div>
      {enCurso && (
        <p role="status" className="text-sm text-tinta-suave">
          {enCurso === "wallet"
            ? "Elige tu wallet y aprueba la firma del mensaje de inicio de sesión."
            : "Preparando la cuenta demo. La primera vez se fondea con Friendbot y tarda unos segundos."}
        </p>
      )}
      {error && <Aviso tipo="error" titulo="No se pudo iniciar sesión">{error}</Aviso>}
      <p className="text-sm text-tinta-tenue">
        Firmar el mensaje no mueve fondos ni crea transacciones. Solo demuestra que controlas la cuenta.
      </p>
      {pie}
    </div>
  );

  if (!presentacion) return formulario;
  return (
    <div className="grid overflow-hidden rounded-documento border border-linea bg-superficie shadow-documento md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <Lateral presentacion={presentacion} />
      {formulario}
    </div>
  );
}
