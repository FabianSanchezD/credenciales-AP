"use client";

import type { Plantilla } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import {
  ETIQUETAS_MODALIDAD,
  ETIQUETAS_NIVEL,
  ETIQUETAS_TIPO_APRENDIZAJE,
} from "@repo/credenciales";
import {
  Aviso,
  Boton,
  Cargando,
  Dialogo,
  EncabezadoPagina,
  Insignia,
  ListaDatos,
  Panel,
  formatearFecha,
  formatearFechaHora,
} from "@repo/ui";
import { Archive, Pencil, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { mensajeError } from "../../lib/errores";
import { useConsulta } from "../../lib/use-consulta";
import { EnlaceBoton, EnlaceTexto, ErrorCarga } from "../comun";
import { FormularioPlantilla } from "../formulario-plantilla";

function vigencia(meses: number | null): string {
  if (meses === null) return "No vence";
  return meses === 1 ? "1 mes desde la emisión" : `${meses} meses desde la emisión`;
}

function Lista({ elementos, vacio }: { elementos: string[]; vacio: string }) {
  if (elementos.length === 0) return <span className="text-tinta-tenue">{vacio}</span>;
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-tinta-tenue">
      {elementos.map((texto, i) => (
        <li key={i}>{texto}</li>
      ))}
    </ul>
  );
}

export function ContenidoDePlantilla({ plantilla }: { plantilla: Plantilla }) {
  return (
    <ListaDatos
      datos={[
        { termino: "Descripción", valor: plantilla.descripcion },
        {
          termino: "Resultados de aprendizaje",
          valor: <Lista elementos={plantilla.resultadosAprendizaje} vacio="Sin resultados" />,
        },
        {
          termino: "Temas evaluados",
          valor: <Lista elementos={plantilla.temasEvaluados} vacio="No se indicaron temas" />,
        },
        { termino: "Duración", valor: <span className="cifras">{plantilla.contexto.horas} horas</span> },
        { termino: "Nivel", valor: ETIQUETAS_NIVEL[plantilla.contexto.nivel] },
        { termino: "Modalidad", valor: ETIQUETAS_MODALIDAD[plantilla.contexto.modalidad] },
        { termino: "Tipo de aprendizaje", valor: ETIQUETAS_TIPO_APRENDIZAJE[plantilla.contexto.tipoAprendizaje] },
        { termino: "Vigencia", valor: vigencia(plantilla.vigenciaMeses) },
      ]}
    />
  );
}

export function VistaPlantillaDetalle() {
  const { id } = useParams<{ id: string }>();
  const { api } = useSesion();
  const consulta = useConsulta(() => api.obtenerPlantilla(id), `plantilla:${id}`);
  const [editando, setEditando] = useState(false);
  const [confirmarArchivo, setConfirmarArchivo] = useState(false);
  const [archivando, setArchivando] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const plantilla = consulta.datos;

  async function archivar() {
    setArchivando(true);
    setErrorArchivo(null);
    try {
      const archivada = await api.archivarPlantilla(id);
      consulta.mutar(() => archivada);
      setConfirmarArchivo(false);
      setAviso("La plantilla quedó archivada. Ya no aparece al emitir.");
    } catch (e) {
      setErrorArchivo(mensajeError(e));
    } finally {
      setArchivando(false);
    }
  }

  return (
    <>
      <p className="mb-3 text-sm">
        <EnlaceTexto href="/plantillas">Volver a plantillas</EnlaceTexto>
      </p>
      {consulta.error && (
        <ErrorCarga titulo="No se pudo cargar la plantilla" mensaje={consulta.error} alReintentar={consulta.recargar} />
      )}
      {consulta.cargando && !plantilla && <Cargando texto="Cargando plantilla" />}
      {plantilla && (
        <>
          <EncabezadoPagina
            titulo={editando ? `Editar ${plantilla.nombre}` : plantilla.nombre}
            descripcion={
              <span className="flex flex-wrap items-center gap-2">
                <Insignia tono={plantilla.archivada ? "neutro" : "marino"}>Versión {plantilla.version}</Insignia>
                {plantilla.archivada && <Insignia>Archivada</Insignia>}
                <span className="text-sm">Actualizada el {formatearFechaHora(plantilla.actualizadaEn)}</span>
              </span>
            }
            acciones={
              !editando && !plantilla.archivada ? (
                <>
                  <EnlaceBoton href={`/emitir?plantilla=${plantilla.id}`} icono={<Send aria-hidden className="size-4" />}>
                    Emitir credencial
                  </EnlaceBoton>
                  <Boton
                    variante="secundario"
                    icono={<Pencil aria-hidden className="size-4" />}
                    onClick={() => {
                      setAviso(null);
                      setEditando(true);
                    }}
                  >
                    Editar plantilla
                  </Boton>
                </>
              ) : undefined
            }
          />
          {aviso && (
            <Aviso tipo="exito" className="mb-6">
              {aviso}
            </Aviso>
          )}
          {editando ? (
            <div className="flex flex-col gap-5">
              <Aviso tipo="info" titulo={`Al guardar se crea la versión ${plantilla.version + 1}`}>
                Las credenciales ya emitidas conservan el contenido con el que se emitieron. Los cambios
                solo aplican a las próximas emisiones.
              </Aviso>
              <FormularioPlantilla
                plantilla={plantilla}
                textoGuardar="Guardar nueva versión"
                alCancelar={() => setEditando(false)}
                alGuardar={async (contenido) => {
                  const nueva = await api.actualizarPlantilla(plantilla.id, contenido);
                  consulta.mutar(() => nueva);
                  setEditando(false);
                  setAviso(`Se guardó la versión ${nueva.version} de la plantilla.`);
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {plantilla.archivada && (
                <Aviso tipo="info" titulo="Plantilla archivada">
                  No se puede usar para emitir ni editar. Las credenciales emitidas con ella siguen siendo
                  válidas.
                </Aviso>
              )}
              <Panel>
                <ContenidoDePlantilla plantilla={plantilla} />
              </Panel>
              <p className="text-sm text-tinta-tenue">Creada el {formatearFecha(plantilla.creadaEn)}.</p>
              {!plantilla.archivada && (
                <div>
                  <Boton
                    variante="fantasma"
                    icono={<Archive aria-hidden className="size-4" />}
                    onClick={() => {
                      setErrorArchivo(null);
                      setConfirmarArchivo(true);
                    }}
                  >
                    Archivar plantilla
                  </Boton>
                </div>
              )}
            </div>
          )}
          <Dialogo
            abierto={confirmarArchivo}
            alCerrar={() => setConfirmarArchivo(false)}
            titulo="¿Archivar esta plantilla?"
            descripcion="Dejará de aparecer al emitir. Las credenciales que ya emitiste con ella no cambian y siguen siendo válidas."
            acciones={
              <>
                <Boton variante="secundario" onClick={() => setConfirmarArchivo(false)} disabled={archivando}>
                  Cancelar
                </Boton>
                <Boton onClick={() => void archivar()} cargando={archivando}>
                  Archivar plantilla
                </Boton>
              </>
            }
          >
            {errorArchivo && (
              <Aviso tipo="error" titulo="No se pudo archivar">
                {errorArchivo}
              </Aviso>
            )}
          </Dialogo>
        </>
      )}
    </>
  );
}
