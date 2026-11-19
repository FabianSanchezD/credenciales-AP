"use client";

import { useSesion } from "@repo/cliente/react";
import { Aviso, Cargando, Panel, Vacio } from "@repo/ui";
import { FileCheck2, FilePlus2, Send, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { esBorrador, ordenarEmisiones } from "../../lib/emisiones";
import { useConsulta } from "../../lib/use-consulta";
import { useEmisor } from "../acceso";
import { EnlaceBoton, EnlaceTexto, ErrorCarga } from "../comun";
import { TablaEmisiones } from "./emisiones";

function Cifra({ etiqueta, valor, href }: { etiqueta: string; valor: number; href: string }) {
  return (
    <Panel className="flex flex-col gap-0.5 px-[18px] py-4">
      <span className="text-[12.5px] text-tinta-suave">{etiqueta}</span>
      <span className="cifras text-[26px] font-bold text-marino">{valor}</span>
      <span className="text-sm">
        <EnlaceTexto href={href}>Ver</EnlaceTexto>
      </span>
    </Panel>
  );
}

function Siguiente({ titulo, children, accion }: { titulo: string; children: ReactNode; accion: ReactNode }) {
  return (
    <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-[17px] font-medium text-tinta">{titulo}</h2>
        <p className="mt-1 text-tinta-suave">{children}</p>
      </div>
      <div className="shrink-0">{accion}</div>
    </Panel>
  );
}

export function VistaInicio() {
  const { api } = useSesion();
  const emisor = useEmisor();
  const datos = useConsulta(
    () => Promise.all([api.listarEmisiones(), api.listarPlantillas(), api.listarTitulares(emisor.id)]),
    `inicio:${emisor.id}`,
  );

  const [emisiones = [], plantillas = [], titulares = []] = datos.datos ?? [];
  const ordenadas = ordenarEmisiones(emisiones);
  const emitidas = emisiones.filter((e) => e.estado === "emitida" || e.estado === "revocada").length;
  const revocadas = emisiones.filter((e) => e.estado === "revocada").length;
  const pendientes = emisiones.filter((e) => esBorrador(e.estado)).length;
  const activas = plantillas.filter((p) => !p.archivada).length;

  let siguiente: ReactNode = null;
  if (datos.datos) {
    if (activas === 0) {
      siguiente = (
        <Siguiente
          titulo="Crea tu primera plantilla"
          accion={
            <EnlaceBoton href="/plantillas/nueva" icono={<FilePlus2 aria-hidden className="size-4" />}>
              Crear plantilla
            </EnlaceBoton>
          }
        >
          Describe el curso con sus resultados de aprendizaje y su contexto. Es el primer paso para emitir.
        </Siguiente>
      );
    } else if (titulares.length === 0) {
      siguiente = (
        <Siguiente
          titulo="Inscribe a tu primer titular"
          accion={
            <EnlaceBoton href="/titulares" icono={<UserPlus aria-hidden className="size-4" />}>
              Inscribir titular
            </EnlaceBoton>
          }
        >
          Pide a la persona el DID de su Digital Wallet. También puedes pegarlo directamente al emitir.
        </Siguiente>
      );
    } else {
      siguiente = (
        <Siguiente
          titulo="Emite una credencial"
          accion={
            <EnlaceBoton href="/emitir" icono={<Send aria-hidden className="size-4" />}>
              Emitir credencial
            </EnlaceBoton>
          }
        >
          Elige una plantilla y un titular. La credencial llega firmada a su wallet en menos de un minuto.
        </Siguiente>
      );
    }
  }

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-marino sm:text-[28px]">{emisor.nombre}</h1>
        <p className="mt-1.5 text-tinta-suave">Resumen de las credenciales que emite tu institución.</p>
      </div>
      {datos.error && <ErrorCarga mensaje={datos.error} alReintentar={datos.recargar} />}
      {datos.cargando && !datos.datos && <Cargando texto="Cargando resumen" />}
      {datos.datos && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra etiqueta="Credenciales emitidas" valor={emitidas} href="/emisiones" />
            <Cifra etiqueta="Revocadas" valor={revocadas} href="/emisiones" />
            <Cifra etiqueta="Plantillas activas" valor={activas} href="/plantillas" />
            <Cifra etiqueta="Titulares inscritos" valor={titulares.length} href="/titulares" />
          </div>
          {pendientes > 0 && (
            <Aviso
              tipo="advertencia"
              titulo={pendientes === 1 ? "Tienes 1 emisión sin terminar" : `Tienes ${pendientes} emisiones sin terminar`}
              accion={<EnlaceTexto href="/emisiones">Revisar emisiones</EnlaceTexto>}
            >
              No llegaron a la wallet del titular. Abre cada una para retomarla.
            </Aviso>
          )}
          {siguiente}
          <section aria-labelledby="titulo-recientes" className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 id="titulo-recientes" className="text-lg font-semibold text-tinta">
                Últimas emisiones
              </h2>
              {ordenadas.length > 0 && <EnlaceTexto href="/emisiones">Ver todas</EnlaceTexto>}
            </div>
            {ordenadas.length > 0 ? (
              <TablaEmisiones emisiones={ordenadas.slice(0, 5)} />
            ) : (
              <Vacio icono={<FileCheck2 aria-hidden />} titulo="Aún no hay emisiones">
                Las credenciales que emitas aparecerán aquí con su estado.
              </Vacio>
            )}
          </section>
        </div>
      )}
    </>
  );
}
