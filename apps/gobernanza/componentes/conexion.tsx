"use client";

import { conectarWalletStellar, ErrorApi, type Firmante } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Boton, Identificador } from "@repo/ui";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { env } from "../lib/env";

type Fallo = { tipo: "no_autorizada"; cuenta: string } | { tipo: "otro"; mensaje: string };

/**
 * Inicio de sesión de la consola. Sigue el mismo flujo que `PanelConexion` de
 * @repo/ui, pero si la API rechaza la cuenta (403) muestra cuál es, para que
 * se pueda agregar a la lista de cuentas de gobernanza.
 */
export function ConexionGobernanza() {
  const { iniciarSesion } = useSesion();
  const [enCurso, setEnCurso] = useState(false);
  const [fallo, setFallo] = useState<Fallo | null>(null);

  async function conectar() {
    setEnCurso(true);
    setFallo(null);
    let firmante: Firmante | null = null;
    try {
      firmante = await conectarWalletStellar(env.stellarNetwork);
      await iniciarSesion(firmante);
    } catch (e) {
      if (e instanceof ErrorApi && e.status === 403 && firmante) {
        setFallo({ tipo: "no_autorizada", cuenta: firmante.address });
      } else {
        setFallo({
          tipo: "otro",
          mensaje:
            e instanceof Error && e.message
              ? e.message
              : "No se pudo completar la conexión. Intenta de nuevo.",
        });
      }
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6 sm:py-12">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-tinta">Consola de gobernanza</h1>
        <p className="mt-2 text-tinta-suave">
          Aquí la entidad que autoriza, como CONESUP o un consejo de varias partes, decide qué
          instituciones pueden emitir credenciales. Solo pueden entrar las cuentas registradas como
          entidad que autoriza.
        </p>
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
      {fallo?.tipo === "no_autorizada" && (
        <Aviso tipo="error" titulo="Esta cuenta no está registrada como entidad que autoriza">
          <p>
            La firma es correcta, pero la cuenta no está en la lista de cuentas de gobernanza. Pide a
            quien administra la plataforma que la agregue y vuelve a conectarte.
          </p>
          <p className="mt-2">
            <Identificador valor={fallo.cuenta} etiqueta="Copiar cuenta" />
          </p>
        </Aviso>
      )}
      {fallo?.tipo === "otro" && (
        <Aviso tipo="error" titulo="No se pudo iniciar sesión">
          {fallo.mensaje}
        </Aviso>
      )}
      <p className="text-sm text-tinta-tenue">
        Firmar el mensaje no mueve fondos ni crea transacciones. Solo demuestra que controlas la cuenta.
      </p>
    </div>
  );
}
