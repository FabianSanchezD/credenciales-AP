"use client";

import type { RegistroEmisor } from "@repo/cliente";
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
  const [cargado, setCargado] = useState<{ clave: string; registro: RegistroEmisor | null } | null>(null);

  useEffect(() => {
    if (!clave) return;
    let vigente = true;
    api.miRegistro().then(
      (registro) => vigente && setCargado({ clave, registro }),
      () => vigente && setCargado({ clave, registro: null }),
    );
    return () => {
      vigente = false;
    };
  }, [api, clave]);

  return cargado && cargado.clave === clave ? cargado.registro : null;
}
