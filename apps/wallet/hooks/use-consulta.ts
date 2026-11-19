"use client";

import { useCallback, useEffect, useState } from "react";

export type EstadoConsulta<T> =
  { tipo: "cargando" } | { tipo: "error"; error: unknown } | { tipo: "lista"; datos: T };

/**
 * Carga datos de la API al montar y cuando cambia `consultar`. Pasa una
 * función memorizada con `useCallback` para no repetir la consulta.
 */
export function useConsulta<T>(consultar: () => Promise<T>) {
  const [estado, setEstado] = useState<EstadoConsulta<T>>({ tipo: "cargando" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    consultar().then(
      (datos) => {
        if (vigente) setEstado({ tipo: "lista", datos });
      },
      (error: unknown) => {
        if (vigente) setEstado({ tipo: "error", error });
      },
    );
    return () => {
      vigente = false;
    };
  }, [consultar, version]);

  /** Vuelve a consultar mostrando el estado de carga. */
  const recargar = useCallback(() => {
    setEstado({ tipo: "cargando" });
    setVersion((v) => v + 1);
  }, []);

  /** Vuelve a consultar sin ocultar lo que ya se muestra. */
  const actualizar = useCallback(() => setVersion((v) => v + 1), []);

  return { estado, recargar, actualizar };
}
