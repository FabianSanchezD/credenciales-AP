"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { mensajeError } from "./errores";

interface Resultado<T> {
  clave: string;
  datos?: T;
  error?: string;
}

export interface Consulta<T> {
  datos: T | undefined;
  error: string | null;
  cargando: boolean;
  /** Vuelve a pedir los datos (p. ej. tras un error o un cambio). */
  recargar: () => void;
  /** Cambia los datos en memoria sin volver a pedirlos. */
  mutar: (cambio: (actual: T | undefined) => T | undefined) => void;
}

/**
 * Carga datos de la API con estado de carga y error. `clave` identifica la
 * consulta: si cambia, se vuelve a cargar.
 */
export function useConsulta<T>(cargar: () => Promise<T>, clave: string): Consulta<T> {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);
  const actual = `${clave}#${intento}`;
  const obtener = useEffectEvent(cargar);

  useEffect(() => {
    let vigente = true;
    obtener().then(
      (datos) => {
        if (vigente) setResultado({ clave: actual, datos });
      },
      (error: unknown) => {
        if (vigente) {
          setResultado((previo) => ({ clave: actual, datos: previo?.datos, error: mensajeError(error) }));
        }
      },
    );
    return () => {
      vigente = false;
    };
  }, [actual]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);
  const mutar = useCallback(
    (cambio: (actual: T | undefined) => T | undefined) =>
      setResultado((previo) => (previo ? { ...previo, datos: cambio(previo.datos) } : previo)),
    [],
  );

  const alDia = resultado?.clave === actual;
  return {
    datos: resultado?.datos,
    error: alDia ? (resultado.error ?? null) : null,
    cargando: !alDia,
    recargar,
    mutar,
  };
}
