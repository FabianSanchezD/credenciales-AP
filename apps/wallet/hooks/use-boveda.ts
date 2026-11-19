"use client";

import { useSesion } from "@repo/cliente/react";
import { useCallback } from "react";
import { useConsulta } from "./use-consulta";

/** Credenciales del titular en sesión (RF-03). */
export function useBoveda() {
  const { api } = useSesion();
  const consultar = useCallback(() => api.listarBoveda(), [api]);
  return useConsulta(consultar);
}
