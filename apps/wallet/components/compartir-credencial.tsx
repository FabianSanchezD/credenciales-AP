"use client";

import type { CredencialEnBoveda } from "@repo/cliente";
import {
  ATRIBUTOS_SELECCIONABLES,
  codificarPresentacion,
  crearPresentacion,
  ETIQUETAS_ATRIBUTO,
  type AtributoSeleccionable,
  type AtributosSeleccionables,
} from "@repo/credenciales";
import {
  Aviso,
  Boton,
  BotonCopiar,
  Casilla,
  CodigoQR,
  EncabezadoPagina,
  Panel,
  resumenContexto,
} from "@repo/ui";
import { ExternalLink, Link2, Share2 } from "lucide-react";
import { useRef, useState } from "react";
import { env } from "../lib/env";
import { mensajeError } from "../lib/errores";
import { atributosDe, rutaCredencial } from "./estado-credencial";
import { EnlaceVolver, VistaCredencial } from "./vista-credencial";

/** Los códigos QR de nivel L admiten hasta unos 2900 caracteres. */
const LARGO_MAXIMO_QR = 2900;

const SIEMPRE_VISIBLE = [
  "La institución que la emitió",
  "El nombre y la descripción del logro",
  "Las fechas de emisión y vigencia",
  "Tu identificador, para comprobar que la credencial es tuya",
];

/** Por omisión se muestra lo que da sentido a la credencial; lo demás lo decide el titular. */
const POR_OMISION: AtributoSeleccionable[] = ["resultadosAprendizaje", "contexto"];

function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`;
}

function vistaPrevia(
  nombre: AtributoSeleccionable,
  atributos: Partial<AtributosSeleccionables>,
): string | null {
  switch (nombre) {
    case "resultadosAprendizaje":
      return atributos.resultadosAprendizaje
        ? plural(atributos.resultadosAprendizaje.length, "resultado", "resultados")
        : null;
    case "temasEvaluados":
      return atributos.temasEvaluados
        ? plural(atributos.temasEvaluados.length, "tema", "temas")
        : null;
    case "contexto":
      return atributos.contexto ? resumenContexto(atributos.contexto) : null;
    case "calificacion":
      return atributos.calificacion ?? null;
  }
}

function Compartir({ credencial }: { credencial: CredencialEnBoveda }) {
  const atributos = atributosDe(credencial);
  // Un atributo vacío (p. ej. una plantilla sin temas evaluados) no se ofrece.
  const disponibles = ATRIBUTOS_SELECCIONABLES.filter((nombre) =>
    credencial.divulgaciones.some(
      ([, n, valor]) => n === nombre && !(Array.isArray(valor) && valor.length === 0),
    ),
  );
  const [seleccion, setSeleccion] = useState<AtributoSeleccionable[]>(() =>
    disponibles.filter((nombre) => POR_OMISION.includes(nombre)),
  );
  const [enlace, setEnlace] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [puedeCompartir] = useState(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
  );

  const resultado = useRef<HTMLDivElement>(null);
  const logro = credencial.credencial.credentialSubject.logro.nombre;
  const revocada = credencial.estado === "revocada";

  function alternar(nombre: AtributoSeleccionable, marcado: boolean) {
    setEnlace(null);
    setSeleccion((actual) => (marcado ? [...actual, nombre] : actual.filter((n) => n !== nombre)));
  }

  async function generar() {
    setGenerando(true);
    setError(null);
    try {
      const presentacion = crearPresentacion(
        credencial.credencial,
        credencial.divulgaciones,
        seleccion,
      );
      const codigo = await codificarPresentacion(presentacion);
      setEnlace(`${env.verificadorUrl.replace(/\/$/, "")}/v#${codigo}`);
      requestAnimationFrame(() => resultado.current?.scrollIntoView({ block: "start" }));
    } catch (e) {
      setError(mensajeError(e, "No se pudo preparar el enlace. Intenta de nuevo."));
    } finally {
      setGenerando(false);
    }
  }

  async function compartir(url: string) {
    try {
      await navigator.share({
        title: logro,
        text: `Mi credencial “${logro}” de ${credencial.emisor.nombre}. Puedes verificarla aquí:`,
        url,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("No se pudo abrir el menú para compartir. Copia el enlace y envíalo tú.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <EnlaceVolver href={rutaCredencial(credencial.vcId)}>Volver a la credencial</EnlaceVolver>
      <EncabezadoPagina
        titulo="Compartir credencial"
        descripcion={`Elige qué datos de “${logro}” puede ver quien reciba el enlace.`}
      />

      {revocada ? (
        <Aviso tipo="error" titulo="No puedes compartir una credencial revocada">
          {credencial.emisor.nombre} la revocó, así que ya no supera la verificación. Si crees que
          es un error, comunícate con la institución.
        </Aviso>
      ) : (
        <>
          <Panel className="flex flex-col gap-5">
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-tinta">Siempre se muestra</h2>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-tinta-suave marker:text-tinta-tenue">
                {SIEMPRE_VISIBLE.map((texto) => (
                  <li key={texto}>{texto}</li>
                ))}
              </ul>
            </section>

            {disponibles.length > 0 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-base font-semibold text-tinta">
                  Tú decides si se muestra
                </legend>
                {disponibles.map((nombre) => (
                  <Casilla
                    key={nombre}
                    etiqueta={ETIQUETAS_ATRIBUTO[nombre]}
                    descripcion={vistaPrevia(nombre, atributos)}
                    checked={seleccion.includes(nombre)}
                    onChange={(e) => alternar(nombre, e.target.checked)}
                  />
                ))}
              </fieldset>
            )}

            <Boton
              tamano="lg"
              anchoCompleto
              icono={<Link2 aria-hidden className="size-5" />}
              cargando={generando}
              onClick={() => void generar()}
            >
              {enlace ? "Generar el enlace de nuevo" : "Generar enlace para compartir"}
            </Boton>
            {error && (
              <Aviso tipo="error" titulo="Algo no salió bien">
                {error}
              </Aviso>
            )}
          </Panel>

          {enlace && (
            <div ref={resultado} className="scroll-mt-32">
              <Panel className="flex flex-col gap-5" aria-live="polite">
                <div>
                  <h2 className="text-lg font-semibold text-tinta">Tu enlace está listo</h2>
                  <p className="mt-1 text-sm text-tinta-suave">
                    {seleccion.length === 0
                      ? "Muestra solo los datos básicos de la credencial."
                      : `Incluye: ${seleccion.map((n) => ETIQUETAS_ATRIBUTO[n].toLowerCase()).join(", ")}.`}
                  </p>
                </div>
                {enlace.length <= LARGO_MAXIMO_QR ? (
                  <figure className="flex flex-col items-center gap-2">
                    <CodigoQR valor={enlace} tamano={240} />
                    <figcaption className="text-center text-sm text-tinta-tenue">
                      Muéstralo para que lo escaneen con la cámara
                    </figcaption>
                  </figure>
                ) : (
                  <p className="text-sm text-tinta-suave">
                    La credencial tiene demasiados datos para un código QR. Comparte el enlace.
                  </p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {puedeCompartir && (
                    <Boton
                      icono={<Share2 aria-hidden className="size-4" />}
                      onClick={() => void compartir(enlace)}
                    >
                      Compartir enlace
                    </Boton>
                  )}
                  <BotonCopiar
                    valor={enlace}
                    etiqueta="Copiar enlace"
                    className="h-10 justify-center border border-linea-fuerte bg-superficie px-4 text-tinta"
                  />
                  <a
                    href={enlace}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-control px-4 text-sm font-medium text-tinta-suave hover:bg-hundido hover:text-tinta"
                  >
                    <ExternalLink aria-hidden className="size-4" />
                    Ver lo que verán
                  </a>
                </div>
                <Aviso titulo="No guardamos una copia">
                  Los datos viajan dentro del enlace: Credenciales AP no lo guarda y quien lo abre
                  verifica la credencial en el momento. Cualquiera que tenga el enlace puede ver lo
                  que elegiste, así que envíalo solo a quien quieras.
                </Aviso>
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CompartirCredencial({ vcId }: { vcId: string }) {
  return (
    <VistaCredencial vcId={vcId}>
      {(credencial) => <Compartir credencial={credencial} />}
    </VistaCredencial>
  );
}
