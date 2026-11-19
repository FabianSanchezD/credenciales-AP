"use client";

import { ErrorApi, type RegistroEmisor } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { useEffect, useState } from "react";

/**
 * Datos de registro de la institución en sesión (representante y correo).
 * `null` mientras carga o si la institución se registró solo con wallet.
 */
export function useMiRegistro(): RegistroEmisor | null {
  const { api, sesion } = useSesion();
  const emisor = sesion?.emisor ?? null;
  const clave = emisor ? `${emisor.id}:${emisor.actualizadoEn}` : null;
  const [registro, setRegistro] = useState<RegistroEmisor | null>(null);

  useEffect(() => {
    if (!clave) {
      setRegistro(null);
      return;
    }
    let vigente = true;
    api.miRegistro().then(
      (datos) => vigente && setRegistro(datos),
      (e: unknown) => {
        if (vigente && e instanceof ErrorApi && e.status === 404) setRegistro(null);
      },
    );
    return () => {
      vigente = false;
    };
  }, [api, clave]);

  return registro;
}
