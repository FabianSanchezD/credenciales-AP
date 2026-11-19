import type { CredencialEnBoveda } from "@repo/cliente";
import { atributosRevelados } from "@repo/credenciales";
import { formatearFecha, Insignia } from "@repo/ui";

/** El sello es decorativo: esta insignia dice el estado en texto. */
export function InsigniaEstado({ credencial }: { credencial: CredencialEnBoveda }) {
  return credencial.estado === "valida" ? (
    <Insignia tono="sello">Válida</Insignia>
  ) : (
    <Insignia tono="lacre">Revocada el {formatearFecha(credencial.revocadaEn)}</Insignia>
  );
}

export function atributosDe(credencial: CredencialEnBoveda) {
  return atributosRevelados(credencial.divulgaciones);
}

export function rutaCredencial(vcId: string): string {
  return `/credenciales/${encodeURIComponent(vcId)}`;
}
