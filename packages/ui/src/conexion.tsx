"use client";

import { conectarWalletStellar } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import type { StellarNetwork } from "@repo/stellar";
import { Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Boton } from "./boton";
import { Aviso } from "./estructura";

function mensaje(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "No se pudo completar la conexión. Intenta de nuevo.";
}

/**
 * Inicio de sesión con una wallet de Stellar (Freighter, xBull, Albedo...). La
 * wallet firma un desafío; la llave nunca sale del dispositivo.
 */
export function PanelConexion({
  titulo,
  descripcion,
  network,
  pie,
}: {
  titulo: ReactNode;
  descripcion: ReactNode;
  network: StellarNetwork;
  pie?: ReactNode;
}) {
  const { iniciarSesion } = useSesion();
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function conectar() {
    setEnCurso(true);
    setError(null);
    try {
      await iniciarSesion(await conectarWalletStellar(network));
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6 sm:py-12">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-tinta">{titulo}</h1>
        <p className="mt-2 text-tinta-suave">{descripcion}</p>
      </div>
      <Boton
        tamano="lg"
        anchoCompleto
        icono={<Wallet aria-hidden className="size-5" />}
        cargando={enCurso}
        disabled={enCurso}
        onClick={() => void conectar()}
      >
        Conectar wallet de Stellar
      </Boton>
      {enCurso && (
        <p role="status" className="text-sm text-tinta-suave">
          Elige tu wallet y aprueba la firma del mensaje de inicio de sesión.
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
