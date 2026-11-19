"use client";

import { ETIQUETAS_CATEGORIA, type CredencialEnBoveda } from "@repo/cliente";
import {
  ETIQUETAS_ATRIBUTO,
  ETIQUETAS_MODALIDAD,
  ETIQUETAS_NIVEL,
  ETIQUETAS_TIPO_APRENDIZAJE,
  ETIQUETAS_TIPO_IDENTIFICACION,
  hashCredencial,
  type TipoEstado,
} from "@repo/credenciales";
import {
  Aviso,
  clasesBoton,
  DocumentoCredencial,
  formatearFecha,
  formatearFechaHora,
  Identificador,
  ListaDatos,
  Panel,
  resumenContexto,
} from "@repo/ui";
import { Share2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { atributosDe, InsigniaEstado, rutaCredencial } from "./estado-credencial";
import { EnlaceVolver, VistaCredencial } from "./vista-credencial";

const ETIQUETAS_ANCLAJE: Record<TipoEstado, string> = {
  StellarDataEntryStatus: "Registro de datos en la cuenta Stellar del emisor",
  ActaVaultStatus: "Bóveda ACTA en Stellar",
};

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-tinta">{titulo}</h2>
      {children}
    </section>
  );
}

function Lista({ elementos }: { elementos: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-tinta marker:text-tinta-tenue">
      {elementos.map((elemento) => (
        <li key={elemento}>{elemento}</li>
      ))}
    </ul>
  );
}

function hashSeguro(credencial: CredencialEnBoveda): string | null {
  try {
    return hashCredencial(credencial.credencial);
  } catch {
    return null;
  }
}

function Detalle({ credencial }: { credencial: CredencialEnBoveda }) {
  const vc = credencial.credencial;
  const atributos = atributosDe(credencial);
  const revocada = credencial.estado === "revocada";
  const hash = hashSeguro(credencial);
  const { emisor } = credencial;

  return (
    <div className="flex flex-col gap-6">
      <EnlaceVolver href="/">Tus credenciales</EnlaceVolver>

      {revocada && (
        <Aviso tipo="error" titulo={`${emisor.nombre} revocó esta credencial`}>
          <p>
            La revocó el {formatearFecha(credencial.revocadaEn)}.
            {credencial.motivoRevocacion &&
              ` Motivo: ${credencial.motivoRevocacion.replace(/[.\s]+$/, "")}.`}
          </p>
          <p className="mt-1">
            Se queda en tu wallet como registro, pero ya no supera la verificación, así que no
            puedes compartirla.
          </p>
        </Aviso>
      )}

      <DocumentoCredencial
        emisor={emisor.nombre}
        logro={vc.credentialSubject.logro.nombre}
        descripcion={vc.credentialSubject.logro.descripcion}
        emitidaEn={credencial.emitidaEn}
        estado={credencial.estado}
        pie={
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <InsigniaEstado credencial={credencial} />
            {!revocada && (
              <Link
                href={`${rutaCredencial(credencial.vcId)}/compartir`}
                className={clasesBoton({ variante: "primario" }) + " w-full sm:w-auto"}
              >
                <Share2 aria-hidden className="size-4" />
                Compartir credencial
              </Link>
            )}
          </div>
        }
      />

      <Panel className="flex flex-col gap-6">
        {(atributos.nombreTitular || atributos.identificacion) && (
          <Seccion titulo="Titular">
            <ListaDatos
              datos={[
                ...(atributos.nombreTitular ? [{ termino: "Nombre", valor: atributos.nombreTitular }] : []),
                ...(atributos.identificacion
                  ? [
                      {
                        termino: ETIQUETAS_TIPO_IDENTIFICACION[atributos.identificacion.tipo],
                        valor: <span className="font-mono text-sm">{atributos.identificacion.numero}</span>,
                      },
                    ]
                  : []),
              ]}
            />
          </Seccion>
        )}
        {atributos.resultadosAprendizaje && atributos.resultadosAprendizaje.length > 0 && (
          <Seccion titulo={ETIQUETAS_ATRIBUTO.resultadosAprendizaje}>
            <Lista elementos={atributos.resultadosAprendizaje} />
          </Seccion>
        )}
        {atributos.temasEvaluados && atributos.temasEvaluados.length > 0 && (
          <Seccion titulo={ETIQUETAS_ATRIBUTO.temasEvaluados}>
            <Lista elementos={atributos.temasEvaluados} />
          </Seccion>
        )}
        {atributos.contexto && (
          <Seccion titulo={ETIQUETAS_ATRIBUTO.contexto}>
            <p className="text-tinta-suave">{resumenContexto(atributos.contexto)}</p>
            <ListaDatos
              datos={[
                {
                  termino: "Horas",
                  valor: <span className="cifras">{atributos.contexto.horas}</span>,
                },
                { termino: "Nivel", valor: ETIQUETAS_NIVEL[atributos.contexto.nivel] },
                { termino: "Modalidad", valor: ETIQUETAS_MODALIDAD[atributos.contexto.modalidad] },
                {
                  termino: "Tipo de aprendizaje",
                  valor: ETIQUETAS_TIPO_APRENDIZAJE[atributos.contexto.tipoAprendizaje],
                },
              ]}
            />
          </Seccion>
        )}
        {atributos.calificacion && (
          <Seccion titulo={ETIQUETAS_ATRIBUTO.calificacion}>
            <p className="text-tinta">{atributos.calificacion}</p>
          </Seccion>
        )}
      </Panel>

      <Panel className="flex flex-col gap-6">
        <Seccion titulo="Institución que la emitió">
          <ListaDatos
            datos={[
              { termino: "Nombre", valor: emisor.nombre },
              { termino: "Tipo", valor: ETIQUETAS_CATEGORIA[emisor.categoria] },
              ...(emisor.sitioWeb && /^https?:\/\//i.test(emisor.sitioWeb)
                ? [
                    {
                      termino: "Sitio web",
                      valor: (
                        <a
                          href={emisor.sitioWeb}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-marino underline underline-offset-2"
                        >
                          {emisor.sitioWeb.replace(/^https?:\/\//, "")}
                        </a>
                      ),
                    },
                  ]
                : []),
              { termino: "Identificador", valor: <Identificador valor={emisor.did} /> },
            ]}
          />
        </Seccion>
        <Seccion titulo="Vigencia">
          <ListaDatos
            datos={[
              { termino: "Emitida el", valor: formatearFecha(credencial.emitidaEn) },
              { termino: "Válida desde", valor: formatearFecha(vc.validFrom) },
              {
                termino: "Válida hasta",
                valor: vc.validUntil ? formatearFecha(vc.validUntil) : "No vence",
              },
              ...(revocada
                ? [{ termino: "Revocada el", valor: formatearFecha(credencial.revocadaEn) }]
                : []),
            ]}
          />
        </Seccion>
      </Panel>

      <details className="group rounded-panel border border-linea bg-superficie/60 px-5 py-4 sm:px-6">
        <summary className="cursor-pointer rounded-control text-sm font-semibold text-tinta-suave hover:text-tinta">
          Datos técnicos de la credencial
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-tinta-suave">
            En Stellar solo se guarda la huella de la credencial y su estado. Tus datos personales
            nunca quedan en la blockchain.
          </p>
          <ListaDatos
            datos={[
              { termino: "Identificador", valor: <Identificador valor={credencial.vcId} /> },
              ...(hash
                ? [{ termino: "Huella (SHA-256)", valor: <Identificador valor={hash} /> }]
                : []),
              { termino: "Anclaje", valor: ETIQUETAS_ANCLAJE[vc.credentialStatus.type] },
              {
                termino: "Cuenta del anclaje",
                valor: <Identificador valor={vc.credentialStatus.cuenta} />,
              },
              { termino: "Firmada el", valor: formatearFechaHora(vc.proof.created) },
              {
                termino: "Formato de firma",
                valor: <code className="font-mono text-[0.8125rem]">{vc.proof.cryptosuite}</code>,
              },
            ]}
          />
        </div>
      </details>
    </div>
  );
}

export function DetalleCredencial({ vcId }: { vcId: string }) {
  return (
    <VistaCredencial vcId={vcId}>
      {(credencial) => <Detalle credencial={credencial} />}
    </VistaCredencial>
  );
}
