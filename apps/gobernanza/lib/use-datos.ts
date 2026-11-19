"use client";

import { useCallback, useEffect, useState } from "react";

interface EstadoDatos<T> {
  datos: T | null;
  error: unknown;
  cargando: boolean;
}

/**
 * Carga datos de la API al montar y cuando cambia `cargar`. `recargar` vuelve
 * a pedirlos sin borrar lo que ya se muestra, para no parpadear tras una acción.
 * `cargar` debe ser estable (useCallback).
 */
export function useDatos<T>(cargar: () => Promise<T>) {
  const [estado, setEstado] = useState<EstadoDatos<T>>({ datos: null, error: null, cargando: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    cargar().then(
      (datos) => {
        if (vigente) setEstado({ datos, error: null, cargando: false });
      },
      (error: unknown) => {
        if (vigente) setEstado((previo) => ({ datos: previo.datos, error, cargando: false }));
      },
    );
    return () => {
      vigente = false;
    };
  }, [cargar, version]);

  const recargar = useCallback(() => {
    setEstado((previo) => ({ ...previo, cargando: true }));
    setVersion((v) => v + 1);
  }, []);

  return { ...estado, recargar };
}
