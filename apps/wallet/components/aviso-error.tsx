"use client";

import { Aviso, Boton } from "@repo/ui";
import { esSesionVencida, mensajeError } from "../lib/errores";
import { useTitular } from "./titular";

/** Error de carga con la acción que lo resuelve: reintentar o volver a entrar. */
export function AvisoError({
  titulo,
  error,
  alReintentar,
}: {
  titulo: string;
  error: unknown;
  alReintentar?: () => void;
}) {
  const { salir } = useTitular();
  if (esSesionVencida(error)) {
    return (
      <Aviso
        tipo="advertencia"
        titulo="Tu sesión venció"
        accion={
          <Boton tamano="sm" variante="secundario" onClick={() => void salir()}>
            Entrar de nuevo
          </Boton>
        }
      >
        Por seguridad, vuelve a abrir tu wallet para continuar.
      </Aviso>
    );
  }
  return (
    <Aviso
      tipo="error"
      titulo={titulo}
      accion={
        alReintentar && (
          <Boton tamano="sm" variante="secundario" onClick={alReintentar}>
            Intentar de nuevo
          </Boton>
        )
      }
    >
      {mensajeError(error)}
    </Aviso>
  );
}
