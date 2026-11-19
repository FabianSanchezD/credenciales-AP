"use client";

import type { Firmante } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Boton, Panel, Sello } from "@repo/ui";
import { BadgeCheck, Eye, FlaskConical, Fingerprint, KeyRound, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { env } from "../lib/env";
import { mensajeError } from "../lib/errores";
import { crearFirmanteCavos, crearFirmanteDemoTitular, guardarMetodo } from "../lib/firmantes";
import { useTitular } from "./titular";

type Intento = "cavos" | "demo";

const PUNTOS = [
  {
    icono: KeyRound,
    titulo: "Tú tienes el control",
    texto:
      "Solo tú abres tu wallet, con una passkey o tu correo. No hay frases secretas que memorizar.",
  },
  {
    icono: Eye,
    titulo: "Compartes solo lo necesario",
    texto: "Eliges qué datos de cada credencial ve la persona o empresa que la revisa.",
  },
  {
    icono: BadgeCheck,
    titulo: "Es gratis",
    texto: "No pagas nada por recibir, guardar ni compartir tus credenciales.",
  },
];

/** Pantalla de entrada (RF-01): crear la wallet o entrar a ella. */
export function InicioSesion() {
  const { iniciarSesion } = useSesion();
  const { cavos } = useTitular();
  const [enCurso, setEnCurso] = useState<Intento | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** El titular pidió entrar con Cavos: al quedar lista la wallet, se abre sesión. */
  const [esperandoCavos, setEsperandoCavos] = useState(false);
  const intentado = useRef<string | null>(null);

  const cavosConfigurado = Boolean(env.cavosAppId);
  const esTestnet = env.stellarNetwork === "testnet";
  const { wallet, estado: estadoCavos } = cavos;

  async function entrar(tipo: Intento, obtener: () => Promise<Firmante>) {
    setEnCurso(tipo);
    setError(null);
    try {
      const firmante = await obtener();
      await iniciarSesion(firmante);
      guardarMetodo(firmante.tipo);
    } catch (e) {
      setError(mensajeError(e, "No se pudo abrir tu wallet. Intenta de nuevo."));
      setEnCurso(null);
    }
  }

  // Cuando el modal de Cavos termina, la wallet queda lista y se abre la sesión.
  useEffect(() => {
    if (!esperandoCavos || !wallet || intentado.current === wallet.address) return;
    intentado.current = wallet.address;
    const firmante = crearFirmanteCavos(wallet);
    let vigente = true;
    iniciarSesion(firmante)
      .then(() => guardarMetodo("cavos"))
      .catch((e: unknown) => {
        if (!vigente) return;
        intentado.current = null;
        setEsperandoCavos(false);
        setError(mensajeError(e, "No se pudo abrir tu wallet. Intenta de nuevo."));
      });
    return () => {
      vigente = false;
    };
  }, [esperandoCavos, wallet, iniciarSesion]);

  const abriendoSesionCavos = esperandoCavos && estadoCavos === "lista";
  const ocupado = enCurso !== null || abriendoSesionCavos;

  function accionCavos() {
    if (!cavosConfigurado) return null;
    if (estadoCavos === "cargando") {
      return (
        <Boton tamano="lg" anchoCompleto cargando>
          Abriendo tu wallet
        </Boton>
      );
    }
    if (estadoCavos === "requiere_aprobacion") {
      return (
        <div className="flex flex-col gap-3">
          <Aviso titulo="Este dispositivo es nuevo para tu wallet">
            Usa tu passkey (huella, rostro o PIN del teléfono) para abrirla aquí.
          </Aviso>
          <Boton
            tamano="lg"
            anchoCompleto
            icono={<Fingerprint aria-hidden className="size-5" />}
            disabled={ocupado}
            onClick={() => {
              setError(null);
              setEsperandoCavos(true);
              cavos.aprobarDispositivoConPasskey().catch((e: unknown) => {
                setEsperandoCavos(false);
                setError(mensajeError(e, "No se pudo aprobar este dispositivo."));
              });
            }}
          >
            Aprobar con mi passkey
          </Boton>
        </div>
      );
    }
    if (estadoCavos === "lista" && wallet) {
      return (
        <div className="flex flex-col gap-2">
          <Boton
            tamano="lg"
            anchoCompleto
            icono={<Wallet aria-hidden className="size-5" />}
            cargando={enCurso === "cavos" || abriendoSesionCavos}
            disabled={ocupado}
            onClick={() => void entrar("cavos", async () => crearFirmanteCavos(wallet))}
          >
            Entrar a mi wallet
          </Boton>
          <Boton variante="fantasma" anchoCompleto disabled={ocupado} onClick={cavos.cerrarSesion}>
            Usar otra cuenta
          </Boton>
        </div>
      );
    }
    return (
      <Boton
        tamano="lg"
        anchoCompleto
        icono={<Wallet aria-hidden className="size-5" />}
        disabled={ocupado}
        onClick={() => {
          setError(null);
          intentado.current = null;
          setEsperandoCavos(true);
          cavos.crearWallet();
        }}
      >
        Crear mi wallet o entrar
      </Boton>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-2 sm:py-6">
      <div className="flex flex-col-reverse gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h1 className="font-serif text-[2rem] font-medium leading-tight text-tinta sm:text-[2.5rem]">
            Tus credenciales académicas, siempre contigo
          </h1>
          <p className="mt-3 text-lg text-tinta-suave">
            Guarda los certificados de tus cursos y programas en un solo lugar y compártelos cuando
            los necesites. Quien los recibe puede comprobar al instante que son auténticos.
          </p>
        </div>
        <Sello estado="valida" tamano={96} className="self-start sm:mt-1" />
      </div>

      <Panel className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-tinta">Abre tu Digital Wallet</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Entra con una passkey o con tu correo. No tienes que instalar nada ni guardar una frase
            semilla.
          </p>
        </div>

        {!cavosConfigurado && (
          <Aviso tipo="advertencia" titulo="La Digital Wallet de Cavos no está configurada">
            Falta el identificador de la app de Cavos (NEXT_PUBLIC_CAVOS_APP_ID), así que por ahora
            no se puede crear una wallet.
            {esTestnet && " Mientras tanto puedes probar con una cuenta demo."}
          </Aviso>
        )}

        {accionCavos()}

        {esTestnet && (
          <div className="flex flex-col gap-2">
            <Boton
              tamano="lg"
              variante="secundario"
              anchoCompleto
              icono={<FlaskConical aria-hidden className="size-5" />}
              cargando={enCurso === "demo"}
              disabled={ocupado}
              onClick={() => void entrar("demo", crearFirmanteDemoTitular)}
            >
              Probar con una cuenta demo
            </Boton>
            <p className="text-sm text-tinta-tenue">
              La cuenta demo vive solo en este navegador y usa la red de pruebas de Stellar.
            </p>
          </div>
        )}

        {(enCurso || abriendoSesionCavos) && (
          <p role="status" className="text-sm text-tinta-suave">
            {enCurso === "demo"
              ? "Preparando la cuenta demo. La primera vez tarda unos segundos."
              : "Abriendo tu sesión de forma segura."}
          </p>
        )}

        {(error ?? cavos.error) && (
          <Aviso tipo="error" titulo="No se pudo abrir tu wallet">
            {error ?? cavos.error} Revisa tu conexión e intenta de nuevo.
          </Aviso>
        )}
      </Panel>

      <ul className="grid gap-5 sm:grid-cols-3">
        {PUNTOS.map(({ icono: Icono, titulo, texto }) => (
          <li key={titulo} className="flex gap-3 sm:flex-col sm:gap-2">
            <Icono aria-hidden className="mt-0.5 size-5 shrink-0 text-sello" />
            <div>
              <h2 className="font-semibold text-tinta">{titulo}</h2>
              <p className="mt-0.5 text-sm text-tinta-suave">{texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
