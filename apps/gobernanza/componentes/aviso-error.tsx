"use client";

import { ErrorApi } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Boton, Identificador } from "@repo/ui";
import { env } from "../lib/env";

/**
 * Explica un error de la API y qué hacer a continuación. Un 403 significa que
 * la cuenta en sesión no está en la lista de cuentas de gobernanza.
 */
export function AvisoError({
  error,
  alReintentar,
  titulo = "No se pudo cargar la información",
}: {
  error: unknown;
  alReintentar?: () => void;
  titulo?: string;
}) {
  const { sesion, cerrarSesion } = useSesion();
  const status = error instanceof ErrorApi ? error.status : null;

  if (status === 403) {
    return (
      <Aviso
        tipo="error"
        titulo="Esta cuenta no está autorizada como entidad que autoriza"
        accion={
          <Boton variante="secundario" tamano="sm" onClick={() => void cerrarSesion()}>
            Conectar otra cuenta
          </Boton>
        }
      >
        <p>
          Pide a quien administra la plataforma que agregue esta cuenta a la lista de cuentas de
          gobernanza y vuelve a conectarte.
        </p>
        {sesion && (
          <p className="mt-2">
            <Identificador valor={sesion.address} etiqueta="Copiar cuenta" />
          </p>
        )}
      </Aviso>
    );
  }

  if (status === 401) {
    return (
      <Aviso
        tipo="advertencia"
        titulo="Tu sesión venció"
        accion={
          <Boton variante="secundario" tamano="sm" onClick={() => void cerrarSesion()}>
            Volver a conectar
          </Boton>
        }
      >
        Vuelve a conectar tu cuenta para seguir revisando las instituciones.
      </Aviso>
    );
  }

  const reintentar = alReintentar && (
    <Boton variante="secundario" tamano="sm" onClick={alReintentar}>
      Intentar de nuevo
    </Boton>
  );

  if (status === 0) {
    return (
      <Aviso tipo="error" titulo="No hay conexión con el servidor" accion={reintentar}>
        Revisa que la API esté disponible en <code className="font-mono">{env.apiUrl}</code> y vuelve a
        intentar.
      </Aviso>
    );
  }

  const mensaje =
    error instanceof Error && error.message ? error.message : "Ocurrió un error inesperado.";
  return (
    <Aviso tipo="error" titulo={titulo} accion={reintentar}>
      {mensaje} Si el problema continúa, intenta de nuevo en unos minutos.
    </Aviso>
  );
}
