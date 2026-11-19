import type { StellarNetwork } from "@repo/stellar";
import type { EstadoCredencial } from "./modelo.js";

/**
 * Driver `stellar` (ADR 0001): el emisor guarda entradas `manageData` en su
 * propia cuenta. Las claves miden 34 caracteres, dentro del límite de 64.
 */
export function claveAnclaje(vcId: string): string {
  return `c:${vcId.replace(/-/g, "")}`;
}

export function claveRevocacion(vcId: string): string {
  return `r:${vcId.replace(/-/g, "")}`;
}

export function estadoStellar(
  network: StellarNetwork,
  cuentaEmisor: string,
  vcId: string,
): EstadoCredencial {
  return {
    id: `stellar:${network}:${cuentaEmisor}/data/${claveAnclaje(vcId)}`,
    type: "StellarDataEntryStatus",
    statusPurpose: "revocation",
    cuenta: cuentaEmisor,
    vcId,
  };
}

export function estadoActa(
  network: StellarNetwork,
  cuentaTitular: string,
  vcId: string,
): EstadoCredencial {
  return {
    id: `acta:${network}:${cuentaTitular}/${vcId}`,
    type: "ActaVaultStatus",
    statusPurpose: "revocation",
    cuenta: cuentaTitular,
    vcId,
  };
}
