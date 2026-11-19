"use client";

import type { TipoFirmante } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import {
  Aviso,
  Boton,
  EncabezadoPagina,
  Identificador,
  Insignia,
  ListaDatos,
  Panel,
  formatearFechaHora,
} from "@repo/ui";
import { Fingerprint, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { env } from "../lib/env";
import { mensajeError } from "../lib/errores";
import { leerMetodo } from "../lib/firmantes";
import { useTitular } from "./titular";

const METODOS: Record<TipoFirmante, string> = {
  cavos: "Digital Wallet de Cavos (passkey o correo)",
  demo: "Cuenta demo de este navegador",
  wallet: "Wallet de Stellar",
};

function SeccionPasskey() {
  const { cavos } = useTitular();
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lista, setLista] = useState(false);

  async function agregar() {
    setEnCurso(true);
    setError(null);
    try {
      await cavos.agregarPasskey();
      setLista(true);
    } catch (e) {
      setError(mensajeError(e, "No se pudo agregar la passkey. Intenta de nuevo."));
    } finally {
      setEnCurso(false);
    }
  }

  let contenido;
  if (cavos.estado === "cargando") {
    contenido = <p className="text-sm text-tinta-suave">Revisando tu wallet de Cavos.</p>;
  } else if (cavos.estado !== "lista") {
    contenido = (
      <Aviso
        titulo="Abre tu wallet de Cavos en este dispositivo"
        accion={
          <Boton tamano="sm" variante="secundario" onClick={cavos.crearWallet}>
            Abrir mi wallet
          </Boton>
        }
      >
        Para revisar o agregar una passkey, primero entra con tu correo o tu passkey.
      </Aviso>
    );
  } else if (cavos.tienePasskey || lista) {
    contenido = (
      <div className="flex flex-col items-start gap-2">
        <Insignia tono="sello">Passkey activa</Insignia>
        <p className="text-sm text-tinta-suave">
          Si cambias o pierdes tu teléfono, puedes abrir tu wallet en otro dispositivo con esta
          passkey.
        </p>
      </div>
    );
  } else if (!cavos.passkeySoportada) {
    contenido = (
      <Aviso tipo="advertencia" titulo="Este dispositivo no admite passkeys">
        Abre tu wallet desde un teléfono o computadora con huella, rostro o PIN para agregar una.
        Mientras tanto puedes entrar con tu correo.
      </Aviso>
    );
  } else {
    contenido = (
      <div className="flex flex-col items-start gap-3">
        <Aviso tipo="advertencia" titulo="Todavía no tienes una passkey">
          Agrégala para recuperar tu wallet si cambias de teléfono. Usa la huella, el rostro o el
          PIN de este dispositivo.
        </Aviso>
        <Boton
          icono={<Fingerprint aria-hidden className="size-4" />}
          cargando={enCurso}
          onClick={() => void agregar()}
        >
          Agregar passkey
        </Boton>
      </div>
    );
  }

  return (
    <Panel className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-tinta">Recuperación</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          La passkey te permite abrir tu wallet en otro dispositivo sin frases secretas.
        </p>
      </div>
      {contenido}
      {error && (
        <Aviso tipo="error" titulo="No se pudo agregar la passkey">
          {error}
        </Aviso>
      )}
    </Panel>
  );
}

/** Datos de la cuenta del titular y cierre de sesión. */
export function Cuenta() {
  const router = useRouter();
  const { sesion, firmante } = useSesion();
  const { cavos, salir } = useTitular();
  const [metodoGuardado] = useState(leerMetodo);
  const [saliendo, setSaliendo] = useState(false);
  const metodo = firmante?.tipo ?? metodoGuardado;

  if (!sesion) return null;

  const datos = [
    { termino: "Identificador", valor: <Identificador valor={sesion.did} /> },
    { termino: "Cuenta Stellar", valor: <Identificador valor={sesion.address} /> },
    {
      termino: "Red",
      valor: env.stellarNetwork === "testnet" ? "Testnet (red de pruebas)" : "Mainnet",
    },
    { termino: "Forma de entrar", valor: metodo ? METODOS[metodo] : "Sin datos en este navegador" },
    ...(metodo === "cavos" && cavos.usuario?.email
      ? [{ termino: "Correo", valor: cavos.usuario.email }]
      : []),
    { termino: "Sesión vigente hasta", valor: formatearFechaHora(sesion.expiraEn) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Cuenta"
        descripcion="Tu wallet es tuya: la llave está en tu dispositivo y nadie más puede usarla."
      />

      <Panel>
        <ListaDatos datos={datos} />
      </Panel>

      {metodo === "cavos" && <SeccionPasskey />}

      {metodo === "demo" && (
        <Aviso tipo="advertencia" titulo="Estás usando una cuenta demo">
          Sirve para conocer la wallet en la red de pruebas. Vive solo en este navegador: si borras
          sus datos, la pierdes y no se puede recuperar.
        </Aviso>
      )}

      <Panel className="flex flex-col items-start gap-3">
        <div>
          <h2 className="text-lg font-semibold text-tinta">Cerrar sesión</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Tus credenciales siguen guardadas. Puedes volver a entrar cuando quieras.
          </p>
        </div>
        <Boton
          variante="secundario"
          icono={<LogOut aria-hidden className="size-4" />}
          cargando={saliendo}
          onClick={() => {
            setSaliendo(true);
            void salir().then(() => router.push("/"));
          }}
        >
          Cerrar sesión
        </Boton>
      </Panel>
    </div>
  );
}
