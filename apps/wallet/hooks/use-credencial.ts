"use client";

import type { CredencialEnBoveda } from "@repo/cliente";
import type { EstadoConsulta } from "./use-consulta";
import { useBoveda } from "./use-boveda";

export type EstadoCredencialConsulta =
  EstadoConsulta<CredencialEnBoveda> | { tipo: "no_encontrada" };

/** Una credencial de la bóveda. La API no tiene consulta individual. */
export function useCredencial(vcId: string) {
  const { estado, recargar } = useBoveda();
  let resultado: EstadoCredencialConsulta;
  if (estado.tipo !== "lista") {
    resultado = estado;
  } else {
    const credencial = estado.datos.find((c) => c.vcId === vcId);
    resultado = credencial ? { tipo: "lista", datos: credencial } : { tipo: "no_encontrada" };
  }
  return { estado: resultado, recargar };
}
