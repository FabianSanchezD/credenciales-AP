import { parseDidStellar } from "@repo/stellar";
import { canonicalizar } from "./canonico.js";
import { sha256Hex } from "./codificacion.js";
import { crearDivulgaciones, digestDivulgacion } from "./divulgacion.js";
import { verificarFirmaMensaje, type FirmaMensaje } from "./firmas.js";
import {
  CONTEXTOS_VC,
  CRYPTOSUITE,
  TIPO_CREDENCIAL,
  type AtributosSeleccionables,
  type Credencial,
  type CredencialFirmada,
  type Divulgacion,
  type EstadoCredencial,
} from "./modelo.js";

export interface DatosCredencial {
  /** UUID v4 sin prefijo. */
  vcId: string;
  emisor: { did: string; nombre: string };
  titularDid: string;
  logro: { nombre: string; descripcion: string };
  atributos: AtributosSeleccionables;
  emitidaEn: Date;
  /** Meses de vigencia, o `null` si no vence. */
  vigenciaMeses: number | null;
  estado: EstadoCredencial;
}

/** Arma la credencial sin firmar y sus divulgaciones (ADR 0004). */
export function construirCredencial(datos: DatosCredencial): {
  credencial: Credencial;
  divulgaciones: Divulgacion[];
} {
  const { divulgaciones, digests } = crearDivulgaciones(datos.atributos);
  let validUntil: string | undefined;
  if (datos.vigenciaMeses !== null) {
    const vence = new Date(datos.emitidaEn);
    vence.setUTCMonth(vence.getUTCMonth() + datos.vigenciaMeses);
    validUntil = vence.toISOString();
  }
  const credencial: Credencial = {
    "@context": [...CONTEXTOS_VC],
    type: ["VerifiableCredential", TIPO_CREDENCIAL],
    id: `urn:uuid:${datos.vcId}`,
    issuer: { id: datos.emisor.did, name: datos.emisor.nombre },
    validFrom: datos.emitidaEn.toISOString(),
    ...(validUntil ? { validUntil } : {}),
    credentialSubject: {
      id: datos.titularDid,
      logro: datos.logro,
      _sd: digests,
    },
    credentialStatus: datos.estado,
  };
  return { credencial, divulgaciones };
}

/** Texto exacto que firma el emisor: la credencial canónica sin `proof`. */
export function mensajeDeFirma(credencial: Credencial): string {
  const { proof: _proof, ...sinPrueba } = credencial;
  return canonicalizar(sinPrueba);
}

export function adjuntarPrueba(
  credencial: Credencial,
  firma: FirmaMensaje,
  creadaEn: Date = new Date(),
): CredencialFirmada {
  return {
    ...credencial,
    proof: {
      type: "DataIntegrityProof",
      cryptosuite: CRYPTOSUITE,
      created: creadaEn.toISOString(),
      verificationMethod: `${credencial.issuer.id}#cuenta`,
      proofPurpose: "assertionMethod",
      esquemaFirma: firma.esquema,
      proofValue: firma.firma,
    },
  };
}

/** SHA-256 (hex) de la credencial firmada en forma canónica: lo que se ancla. */
export function hashCredencial(credencial: CredencialFirmada): string {
  return sha256Hex(canonicalizar(credencial));
}

/** Comprueba que la prueba la produjo la cuenta del DID del emisor. */
export function verificarPrueba(credencial: CredencialFirmada): boolean {
  const did = parseDidStellar(credencial.issuer.id);
  if (!did) return false;
  if (credencial.proof.verificationMethod.split("#")[0] !== credencial.issuer.id) {
    return false;
  }
  return verificarFirmaMensaje(mensajeDeFirma(credencial), {
    esquema: credencial.proof.esquemaFirma,
    publicKey: did.address,
    firma: credencial.proof.proofValue,
  });
}

/** Cada divulgación presentada debe tener su hash dentro de `_sd`. */
export function divulgacionesValidas(
  credencial: Credencial,
  divulgaciones: Divulgacion[],
): boolean {
  const permitidos = new Set(credencial.credentialSubject._sd);
  const vistos = new Set<string>();
  for (const divulgacion of divulgaciones) {
    if (vistos.has(divulgacion[1])) return false;
    vistos.add(divulgacion[1]);
    if (!permitidos.has(digestDivulgacion(divulgacion))) return false;
  }
  return true;
}

export function vcIdDe(credencial: Credencial): string {
  return credencial.id.replace(/^urn:uuid:/, "");
}
