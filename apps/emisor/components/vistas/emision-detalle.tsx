"use client";

import type { Emision, TransaccionPorFirmar } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import {
  AreaTexto,
  Aviso,
  Boton,
  Campo,
  Cargando,
  Dialogo,
  DocumentoCredencial,
  EncabezadoPagina,
  Identificador,
  ListaDatos,
  Panel,
  Pasos,
  formatearFechaHora,
} from "@repo/ui";
import { Ban, PenLine, Play, RefreshCw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { esBorrador, estadoSello } from "../../lib/emisiones";
import { mensajeError } from "../../lib/errores";
import { useConsulta } from "../../lib/use-consulta";
import { useFirmante } from "../../lib/use-firmante";
import { useEmisor } from "../acceso";
import { EnlaceBoton, EnlaceTexto, EnlaceTransaccion, ErrorCarga, InsigniaEmision } from "../comun";

const PASOS_REVOCACION = ["Preparar revocación", "Firmar y anclar en Stellar", "Revocada"];

interface Revocacion {
  fase: number;
  enCurso: boolean;
  error: string | null;
  motivo: string;
  corregir: boolean;
  transaccion: TransaccionPorFirmar | null;
}

function urlCorreccion(emision: Emision): string {
  const params = new URLSearchParams({
    plantilla: emision.plantillaId,
    titular: emision.titularDid,
    correccion: emision.id,
  });
  return `/emitir?${params.toString()}`;
}

export function VistaEmisionDetalle() {
  const { id } = useParams<{ id: string }>();
  const { api } = useSesion();
  const emisor = useEmisor();
  const router = useRouter();
  const { obtenerFirmante } = useFirmante();
  const consulta = useConsulta(() => api.obtenerEmision(id), `emision:${id}`);
  const plantilla = useConsulta(
    () => (consulta.datos ? api.obtenerPlantilla(consulta.datos.plantillaId).catch(() => null) : Promise.resolve(null)),
    `plantilla-de:${consulta.datos?.plantillaId ?? ""}`,
  );

  const [dialogo, setDialogo] = useState<{ corregir: boolean } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [revocacion, setRevocacion] = useState<Revocacion | null>(null);

  const emision = consulta.datos;

  async function revocar(desde: Revocacion) {
    let estado: Revocacion = { ...desde, enCurso: true, error: null };
    setRevocacion(estado);
    try {
      if (estado.fase === 0) {
        const preparada = await api.prepararRevocacion(id, estado.motivo);
        estado = { ...estado, fase: 1, transaccion: preparada.transaccion };
        setRevocacion(estado);
      }
      if (estado.fase === 1) {
        if (!estado.transaccion) throw new Error("Falta la transacción de revocación. Intenta de nuevo.");
        const firmante = await obtenerFirmante();
        const xdr = await firmante.firmarTransaccion(estado.transaccion.xdr, estado.transaccion.networkPassphrase);
        const revocada = await api.enviarRevocacion(id, xdr);
        consulta.mutar(() => revocada);
        estado = { ...estado, fase: 2 };
        if (estado.corregir) {
          router.push(urlCorreccion(revocada));
        }
      }
      setRevocacion({ ...estado, enCurso: false });
    } catch (e) {
      setRevocacion({ ...estado, enCurso: false, error: mensajeError(e) });
    }
  }

  function confirmar() {
    const texto = motivo.trim();
    if (!texto) {
      setErrorMotivo("Escribe el motivo. Queda registrado junto con la fecha de revocación.");
      return;
    }
    if (texto.length > 500) {
      setErrorMotivo("El motivo puede tener hasta 500 caracteres.");
      return;
    }
    const corregir = dialogo?.corregir ?? false;
    // El diálogo se cierra antes de firmar para que el selector de wallets quede accesible.
    setDialogo(null);
    void revocar({ fase: 0, enCurso: false, error: null, motivo: texto, corregir, transaccion: null });
  }

  function abrirDialogo(corregir: boolean) {
    setMotivo("");
    setErrorMotivo(null);
    setDialogo({ corregir });
  }

  return (
    <>
      <p className="mb-3 text-sm">
        <EnlaceTexto href="/emisiones">Volver a emisiones</EnlaceTexto>
      </p>
      {consulta.error && (
        <ErrorCarga titulo="No se pudo cargar la emisión" mensaje={consulta.error} alReintentar={consulta.recargar} />
      )}
      {consulta.cargando && !emision && <Cargando texto="Cargando emisión" />}
      {emision && (
        <>
          <EncabezadoPagina
            titulo={emision.plantillaNombre}
            descripcion={
              <span className="flex flex-wrap items-center gap-2">
                <InsigniaEmision estado={emision.estado} />
                <span className="text-sm">Creada el {formatearFechaHora(emision.creadaEn)}</span>
              </span>
            }
            acciones={
              emision.estado === "emitida" && !revocacion ? (
                <>
                  <Boton
                    variante="secundario"
                    icono={<PenLine aria-hidden className="size-4" />}
                    onClick={() => abrirDialogo(true)}
                  >
                    Corregir credencial
                  </Boton>
                  <Boton variante="peligro" icono={<Ban aria-hidden className="size-4" />} onClick={() => abrirDialogo(false)}>
                    Revocar credencial
                  </Boton>
                </>
              ) : esBorrador(emision.estado) ? (
                <EnlaceBoton href={`/emitir?emision=${emision.id}`} icono={<Play aria-hidden className="size-4" />}>
                  Retomar emisión
                </EnlaceBoton>
              ) : undefined
            }
          />

          {revocacion && (
            <Panel aria-live="polite" className="mb-6 flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-tinta">
                {revocacion.fase >= 2 ? "Credencial revocada" : "Revocación en curso"}
              </h2>
              <Pasos pasos={PASOS_REVOCACION} actual={revocacion.fase >= 2 ? PASOS_REVOCACION.length : revocacion.fase} />
              {revocacion.fase === 0 && (
                <p className="text-sm text-tinta-suave">La plataforma prepara la transacción que marca la credencial como revocada.</p>
              )}
              {revocacion.fase === 1 && (
                <p className="text-sm text-tinta-suave">
                  {revocacion.enCurso ? "Revisa tu wallet y aprueba la transacción. " : ""}
                  La revocación se anota en Stellar. La comisión de red la paga la institución.
                </p>
              )}
              {revocacion.fase >= 2 && (
                <p className="text-sm text-tinta-suave">
                  {revocacion.corregir
                    ? "Abriendo la emisión de la credencial corregida."
                    : "Desde ahora la credencial no pasa la verificación."}
                </p>
              )}
              {revocacion.error && (
                <Aviso
                  tipo="error"
                  titulo="No se pudo completar la revocación"
                  accion={
                    <div className="flex flex-wrap gap-2">
                      <Boton
                        tamano="sm"
                        icono={<RefreshCw aria-hidden className="size-4" />}
                        onClick={() => void revocar(revocacion)}
                      >
                        Reintentar este paso
                      </Boton>
                      <Boton tamano="sm" variante="secundario" onClick={() => setRevocacion(null)}>
                        Cancelar
                      </Boton>
                    </div>
                  }
                >
                  {revocacion.error}
                </Aviso>
              )}
            </Panel>
          )}

          {emision.estado === "revocada" && emision.motivoRevocacion && !revocacion && (
            <Aviso tipo="error" titulo="Credencial revocada" className="mb-6">
              <p>Motivo: {emision.motivoRevocacion}</p>
              <p className="mt-1">
                La credencial sigue en la wallet del titular, pero ya no
              pasa la verificación. Si había un error, puedes{" "}
              <EnlaceTexto href={urlCorreccion(emision)}>emitir una credencial corregida</EnlaceTexto>.
              </p>
            </Aviso>
          )}
          {esBorrador(emision.estado) && (
            <Aviso tipo="advertencia" titulo="Emisión sin terminar" className="mb-6">
              {emision.estado === "borrador"
                ? "La credencial se preparó pero no se firmó. No está en la wallet del titular."
                : "La credencial se firmó pero no se ancló en Stellar. Todavía no se puede verificar."}{" "}
              Retómala para terminarla.
            </Aviso>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-start">
            <Panel>
              <h2 className="mb-4 text-lg font-semibold text-tinta">Datos de la emisión</h2>
              <ListaDatos
                datos={[
                  { termino: "Titular", valor: <Identificador valor={emision.titularDid} etiqueta="Copiar DID" /> },
                  {
                    termino: "Plantilla",
                    valor: (
                      <EnlaceTexto href={`/plantillas/${emision.plantillaId}`}>
                        {emision.plantillaNombre}
                        {plantilla.datos ? ` (versión ${plantilla.datos.version})` : ""}
                      </EnlaceTexto>
                    ),
                  },
                  {
                    termino: "Identificador",
                    valor: <Identificador valor={emision.id} etiqueta="Copiar identificador" />,
                  },
                  {
                    termino: "Huella (hash)",
                    valor: emision.hash ? (
                      <Identificador valor={emision.hash} etiqueta="Copiar hash" />
                    ) : (
                      <span className="text-tinta-tenue">Se genera al firmar</span>
                    ),
                  },
                  {
                    termino: "Anclaje",
                    valor: emision.txHash ? (
                      <EnlaceTransaccion txHash={emision.txHash} />
                    ) : (
                      <span className="text-tinta-tenue">Sin anclar</span>
                    ),
                  },
                  { termino: "Emitida", valor: emision.emitidaEn ? formatearFechaHora(emision.emitidaEn) : "Todavía no" },
                  ...(emision.revocadaEn
                    ? [
                        { termino: "Revocada", valor: formatearFechaHora(emision.revocadaEn) },
                        { termino: "Motivo", valor: emision.motivoRevocacion ?? "Sin motivo registrado" },
                      ]
                    : []),
                  ...(emision.txRevocacion
                    ? [
                        {
                          termino: "Transacción de revocación",
                          valor: <EnlaceTransaccion txHash={emision.txRevocacion} />,
                        },
                      ]
                    : []),
                ]}
              />
            </Panel>
            <DocumentoCredencial
              emisor={emisor.nombre}
              logro={emision.plantillaNombre}
              descripcion={plantilla.datos?.descripcion}
              emitidaEn={emision.emitidaEn ?? emision.creadaEn}
              estado={estadoSello(emision.estado)}
              compacto
            />
          </div>

          <Dialogo
            abierto={dialogo !== null}
            alCerrar={() => setDialogo(null)}
            titulo={dialogo?.corregir ? "Corregir credencial" : "Revocar credencial"}
            descripcion={
              dialogo?.corregir
                ? "Para corregir, primero se revoca esta credencial y luego emites una nueva con los datos correctos."
                : "La credencial seguirá en la wallet del titular, pero dejará de pasar la verificación."
            }
            acciones={
              <>
                <Boton variante="secundario" onClick={() => setDialogo(null)}>
                  Cancelar
                </Boton>
                <Boton variante="peligro" onClick={confirmar}>
                  {dialogo?.corregir ? "Revocar y corregir" : "Revocar credencial"}
                </Boton>
              </>
            }
          >
            <Campo
              etiqueta="Motivo de la revocación"
              error={errorMotivo}
              ayuda="Queda registrado con la fecha. Por ejemplo, Error en la calificación registrada."
            >
              {(props) => (
                <AreaTexto
                  {...props}
                  value={motivo}
                  maxLength={500}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              )}
            </Campo>
            <Aviso tipo="advertencia">
              Esta acción no se puede deshacer. Tu wallet te pedirá aprobar la transacción.
            </Aviso>
          </Dialogo>
        </>
      )}
    </>
  );
}
