"use client";

import { ErrorApi, type ResultadoVerificacion } from "@repo/cliente";
import { decodificarPresentacion } from "@repo/credenciales";
import { Aviso, Boton, clasesBoton } from "@repo/ui";
import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { api } from "../lib/api";
import { codigoDelFragmento, esCodigoValido } from "../lib/codigo";
import { Resultado, titularResultado } from "./resultado";

type Estado =
  | { tipo: "resultado"; resultado: ResultadoVerificacion }
  | { tipo: "danado" }
  | { tipo: "error"; mensaje: string };

function suscribirFragmento(avisar: () => void) {
  window.addEventListener("hashchange", avisar);
  return () => window.removeEventListener("hashchange", avisar);
}

/** `null` en el servidor: el fragmento solo existe en el navegador. */
function useCodigo(): string | null {
  return useSyncExternalStore(
    suscribirFragmento,
    () => codigoDelFragmento(window.location.hash),
    () => null,
  );
}

async function verificar(codigo: string): Promise<Estado> {
  if (!esCodigoValido(codigo)) return { tipo: "danado" };
  try {
    // Se revisa aquí primero para no consultar la red con un enlace roto.
    await decodificarPresentacion(codigo);
  } catch {
    return { tipo: "danado" };
  }
  try {
    return { tipo: "resultado", resultado: await api.verificar({ codigo }) };
  } catch (error) {
    if (error instanceof ErrorApi && (error.status === 400 || error.status === 422)) {
      return { tipo: "danado" };
    }
    const mensaje =
      error instanceof ErrorApi && error.status !== 0
        ? error.message
        : "No pudimos conectar con el servicio de verificación. Revisa tu conexión a internet.";
    return { tipo: "error", mensaje };
  }
}

export function Verificacion() {
  const codigo = useCodigo();
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState<{ clave: string; estado: Estado } | null>(null);

  const clave = codigo ? `${intento}:${codigo}` : null;

  useEffect(() => {
    if (!codigo || !clave) return;
    let vigente = true;
    void verificar(codigo).then((estado) => {
      if (vigente) setRespuesta({ clave, estado });
    });
    return () => {
      vigente = false;
    };
  }, [codigo, clave]);

  const estado = respuesta && respuesta.clave === clave ? respuesta.estado : null;

  let contenido;
  let anuncio = "";
  if (codigo === null) {
    contenido = <EnCurso />;
  } else if (codigo === "") {
    contenido = <SinCodigo />;
    anuncio = "Falta el código de la credencial.";
  } else if (!estado) {
    contenido = <EnCurso />;
    anuncio = "Verificando la credencial.";
  } else if (estado.tipo === "danado") {
    contenido = <CodigoDanado />;
    anuncio = "No pudimos leer este enlace.";
  } else if (estado.tipo === "error") {
    contenido = <ErrorVerificacion mensaje={estado.mensaje} alReintentar={() => setIntento((n) => n + 1)} />;
    anuncio = "No pudimos completar la verificación.";
  } else {
    contenido = <Resultado key={clave} resultado={estado.resultado} />;
    anuncio = titularResultado(estado.resultado);
  }

  return (
    <>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {anuncio}
      </p>
      {contenido}
    </>
  );
}

function EnCurso() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-documento border border-linea bg-superficie px-6 py-12 text-center shadow-documento">
      <div aria-hidden className="size-32 rounded-full border-2 border-dashed border-linea-fuerte motion-safe:animate-[spin_12s_linear_infinite]" />
      <div className="flex flex-col items-center gap-1">
        <p className="text-lg font-semibold text-tinta">Verificando en Stellar...</p>
        <p className="max-w-sm text-sm text-tinta-suave">
          Revisamos la firma de la institución y el registro público. Suele tomar menos de 10 segundos.
        </p>
      </div>
    </div>
  );
}

function EnlaceInicio({ texto }: { texto: string }) {
  return (
    <Link href="/" className={clasesBoton({ variante: "secundario" })}>
      {texto}
    </Link>
  );
}

function Problema({ titulo, children, accion }: { titulo: string; children: ReactNode; accion: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-documento border border-linea bg-superficie p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-marino">{titulo}</h1>
      <div className="flex max-w-prose flex-col gap-3 text-tinta-suave">{children}</div>
      <div className="flex flex-wrap gap-2 pt-1">{accion}</div>
    </div>
  );
}

function SinCodigo() {
  return (
    <Problema titulo="Falta el código de la credencial" accion={<EnlaceInicio texto="Pegar un enlace" />}>
      <p>
        Este enlace no trae la credencial que se quiere verificar. Suele pasar cuando el enlace se copia
        incompleto.
      </p>
      <p>
        Pide a la persona que te la compartió que te envíe el enlace otra vez o que te muestre el código QR
        desde su billetera de credenciales.
      </p>
    </Problema>
  );
}

function CodigoDanado() {
  return (
    <Problema titulo="No pudimos leer este enlace" accion={<EnlaceInicio texto="Pegar otro enlace" />}>
      <p>
        El enlace está incompleto o se dañó al copiarlo, así que no podemos saber qué credencial es. Esto no
        significa que la credencial sea falsa.
      </p>
      <p>
        Pide a la persona titular que genere un enlace nuevo desde su billetera de credenciales y te lo
        envíe, o que te muestre el código QR para escanearlo.
      </p>
    </Problema>
  );
}

function ErrorVerificacion({ mensaje, alReintentar }: { mensaje: string; alReintentar: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-marino">No pudimos completar la verificación</h1>
      <Aviso
        tipo="error"
        titulo={mensaje}
        accion={
          <Boton onClick={alReintentar} icono={<RotateCw aria-hidden className="size-4" />}>
            Intentar de nuevo
          </Boton>
        }
      >
        Es un problema de conexión de nuestro lado o del tuyo. No dice nada sobre la credencial.
      </Aviso>
    </div>
  );
}
