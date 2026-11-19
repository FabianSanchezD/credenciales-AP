"use client";

import { conectarWalletStellar, crearFirmanteDemo, type Firmante } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import type { StellarNetwork } from "@repo/stellar";
import { FlaskConical, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Boton } from "./boton";
import { Aviso } from "./estructura";

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
}: {
  titulo: ReactNode;
  descripcion: ReactNode;
  network: StellarNetwork;
  /** Clave de localStorage para la cuenta demo de esta app. */
  claveDemo: string;
  horizonUrl?: string;
  pie?: ReactNode;
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

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6 sm:py-12">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-tinta">{titulo}</h1>
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
}
