"use client";

import type { CredencialEnBoveda } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import {
  Cargando,
  DocumentoCredencial,
  EncabezadoPagina,
  Pasos,
  resumenContexto,
  Vacio,
} from "@repo/ui";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { useBoveda } from "../hooks/use-boveda";
import { AvisoError } from "./aviso-error";
import { atributosDe, InsigniaEstado, rutaCredencial } from "./estado-credencial";
import { PanelIdentificador } from "./panel-identificador";

function TarjetaCredencial({ credencial }: { credencial: CredencialEnBoveda }) {
  const { contexto } = atributosDe(credencial);
  const logro = credencial.credencial.credentialSubject.logro;
  return (
    <Link
      href={rutaCredencial(credencial.vcId)}
      className="group block rounded-documento transition-transform motion-safe:hover:-translate-y-0.5"
    >
      <DocumentoCredencial
        compacto
        emisor={credencial.emisor.nombre}
        logro={logro.nombre}
        emitidaEn={credencial.emitidaEn}
        estado={credencial.estado}
        className="group-hover:border-linea-fuerte"
        pie={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <InsigniaEstado credencial={credencial} />
            {contexto && (
              <span className="text-sm text-tinta-suave">{resumenContexto(contexto)}</span>
            )}
          </div>
        }
      />
      <span className="sr-only">Ver el detalle de {logro.nombre}</span>
    </Link>
  );
}

/** Inicio del titular: sus credenciales y el identificador para recibir más. */
export function InicioTitular() {
  const { sesion } = useSesion();
  const { estado, recargar } = useBoveda();
  const did = sesion?.did ?? "";

  if (estado.tipo === "cargando") {
    return (
      <>
        <EncabezadoPagina titulo="Tus credenciales" />
        <Cargando texto="Cargando tus credenciales" />
      </>
    );
  }

  if (estado.tipo === "error") {
    return (
      <div className="flex flex-col gap-6">
        <EncabezadoPagina titulo="Tus credenciales" />
        <AvisoError
          titulo="No pudimos cargar tus credenciales"
          error={estado.error}
          alReintentar={recargar}
        />
        <PanelIdentificador did={did} />
      </div>
    );
  }

  const credenciales = [...estado.datos].sort((a, b) => b.emitidaEn.localeCompare(a.emitidaEn));

  if (credenciales.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <EncabezadoPagina
          titulo="Tus credenciales"
          descripcion="Aquí vas a ver las credenciales que te emitan las instituciones."
        />
        <Vacio icono={<Inbox aria-hidden />} titulo="Todavía no tienes credenciales">
          Para recibir la primera, comparte tu identificador con tu institución. Cuando la emita,
          aparecerá aquí sin que tengas que hacer nada más.
        </Vacio>
        <div className="rounded-panel border border-linea bg-superficie p-5">
          <h2 className="sr-only">Cómo recibir una credencial</h2>
          <Pasos
            pasos={["Crea tu wallet", "Comparte tu identificador", "Recibe tu credencial"]}
            actual={1}
          />
        </div>
        <PanelIdentificador did={did} />
      </div>
    );
  }

  const validas = credenciales.filter((c) => c.estado === "valida").length;
  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Tus credenciales"
        descripcion={
          validas === credenciales.length
            ? `Tienes ${credenciales.length === 1 ? "1 credencial" : `${credenciales.length} credenciales`}. Abre una para ver el detalle o compartirla.`
            : `Tienes ${validas} de ${credenciales.length} credenciales vigentes. Abre una para ver el detalle o compartirla.`
        }
      />
      <section aria-label="Lista de credenciales">
        <ul className="flex flex-col gap-4">
          {credenciales.map((credencial) => (
            <li key={credencial.vcId}>
              <TarjetaCredencial credencial={credencial} />
            </li>
          ))}
        </ul>
      </section>
      <PanelIdentificador did={did} />
    </div>
  );
}
