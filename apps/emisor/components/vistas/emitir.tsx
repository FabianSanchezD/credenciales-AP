"use client";

import type { Emision, Plantilla, TitularInscrito, TransaccionPorFirmar } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { ETIQUETAS_TIPO_IDENTIFICACION, TIPOS_IDENTIFICACION, type TipoIdentificacion } from "@repo/credenciales";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  DocumentoCredencial,
  EncabezadoPagina,
  Entrada,
  Identificador,
  ListaDatos,
  Panel,
  Pasos,
  Sello,
  Selector,
  Vacio,
  resumenContexto,
} from "@repo/ui";
import { LayoutTemplate, RefreshCw, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { guardarPaso, leerPaso, olvidarPaso } from "../../lib/borradores";
import { mensajeError } from "../../lib/errores";
import { useConsulta } from "../../lib/use-consulta";
import { useFirmante } from "../../lib/use-firmante";
import { validarDid } from "../../lib/validacion";
import { useEmisor } from "../acceso";
import { EnlaceBoton, EnlaceTexto, EnlaceTransaccion, ErrorCarga } from "../comun";

const PASOS = ["Preparar credencial", "Firmar credencial", "Anclar en Stellar", "Lista"];

const EXPLICACION = [
  "La plataforma arma la credencial con el contenido de tu plantilla y el DID del titular.",
  "Tu wallet firma la credencial. La firma demuestra que tu institución la emitió.",
  "Tu wallet aprueba una transacción que escribe la huella (hash) de la credencial en Stellar. La comisión de red la paga la institución, nunca el estudiante.",
  "La credencial está en la wallet del titular y cualquiera puede verificarla.",
];

const OTRO_DID = "__otro__";

interface Proceso {
  fase: number;
  enCurso: boolean;
  error: string | null;
  emision: Emision | null;
  mensajeAFirmar: string | null;
  transaccion: TransaccionPorFirmar | null;
}

const PROCESO_INICIAL: Proceso = {
  fase: 0,
  enCurso: false,
  error: null,
  emision: null,
  mensajeAFirmar: null,
  transaccion: null,
};

function vigencia(meses: number | null): string {
  if (meses === null) return "No vence";
  return meses === 1 ? "1 mes desde la emisión" : `${meses} meses desde la emisión`;
}

function ListaCorta({ elementos }: { elementos: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-tinta-tenue">
      {elementos.map((texto, i) => (
        <li key={i}>{texto}</li>
      ))}
    </ul>
  );
}

/** Retomar desde una emisión sin terminar guardada en esta pestaña. */
function procesoRetomado(emisionId: string | null): Proceso | null {
  if (!emisionId) return null;
  const paso = leerPaso(emisionId);
  if (!paso) return null;
  if (paso.transaccion) {
    return { ...PROCESO_INICIAL, fase: 2, mensajeAFirmar: paso.mensajeAFirmar ?? null, transaccion: paso.transaccion };
  }
  if (paso.mensajeAFirmar) return { ...PROCESO_INICIAL, fase: 1, mensajeAFirmar: paso.mensajeAFirmar };
  return null;
}

export function VistaEmitir() {
  const { api } = useSesion();
  const emisor = useEmisor();
  const parametros = useSearchParams();
  const router = useRouter();
  const { obtenerFirmante } = useFirmante();

  const plantillas = useConsulta(() => api.listarPlantillas(), "plantillas");
  const titulares = useConsulta(() => api.listarTitulares(emisor.id), `titulares:${emisor.id}`);

  const retomarId = parametros.get("emision");
  const retomada = useConsulta(
    () => (retomarId ? api.obtenerEmision(retomarId) : Promise.resolve(null)),
    `retomar:${retomarId ?? ""}`,
  );
  const correccionDe = parametros.get("correccion");

  const [plantillaId, setPlantillaId] = useState(parametros.get("plantilla") ?? "");
  const [titularElegido, setTitularElegido] = useState(parametros.get("titular") ?? "");
  const [didPegado, setDidPegado] = useState("");
  const [nombreTitular, setNombreTitular] = useState("");
  const [tipoIdentificacion, setTipoIdentificacion] = useState<TipoIdentificacion | "">("");
  const [numeroIdentificacion, setNumeroIdentificacion] = useState("");
  const [calificacion, setCalificacion] = useState("");
  const [errores, setErrores] = useState<{
    plantilla?: string;
    titular?: string;
    nombre?: string;
    identificacion?: string;
  }>({});
  const [proceso, setProceso] = useState<Proceso | null>(() => procesoRetomado(retomarId));
  const [hoy] = useState(() => new Date().toISOString());

  const activas = (plantillas.datos ?? []).filter((p) => !p.archivada);
  const inscritos: TitularInscrito[] = titulares.datos ?? [];

  // Si el DID que llega por la URL no está inscrito, se muestra como DID pegado.
  const didDeUrl = parametros.get("titular") ?? "";
  const urlNoInscrita =
    didDeUrl !== "" && titulares.datos !== undefined && !inscritos.some((t) => t.did === didDeUrl);
  const seleccion = urlNoInscrita && titularElegido === didDeUrl ? OTRO_DID : titularElegido;
  const textoPegado = urlNoInscrita && didPegado === "" && titularElegido === didDeUrl ? didDeUrl : didPegado;

  const emisionRetomada = retomada.datos ?? null;
  const idPlantilla = plantillaId || emisionRetomada?.plantillaId || "";
  const plantilla: Plantilla | undefined = (plantillas.datos ?? []).find((p) => p.id === idPlantilla);
  const titularDid = (
    seleccion === OTRO_DID ? textoPegado : seleccion || emisionRetomada?.titularDid || ""
  ).trim();

  const bloqueado = proceso !== null;

  function revisar(): boolean {
    const nuevos: typeof errores = {};
    if (!plantilla || plantilla.archivada) nuevos.plantilla = "Elige una plantilla activa.";
    const problema = validarDid(titularDid);
    if (problema) nuevos.titular = seleccion === "" ? "Elige un titular o pega su DID." : problema;
    if (nombreTitular.trim().length < 2) nuevos.nombre = "Escribe el nombre completo del titular.";
    if (tipoIdentificacion && !numeroIdentificacion.trim()) nuevos.identificacion = "Escribe el número del documento.";
    if (!tipoIdentificacion && numeroIdentificacion.trim()) nuevos.identificacion = "Elige el tipo de documento.";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function ejecutar(desde: Proceso) {
    let estado: Proceso = { ...desde, enCurso: true, error: null };
    setProceso(estado);
    try {
      if (estado.fase === 0) {
        if (!plantilla) throw new Error("Elige una plantilla.");
        const preparada = await api.prepararEmision({
          plantillaId: plantilla.id,
          titularDid,
          titularNombre: nombreTitular.trim(),
          identificacion:
            tipoIdentificacion && numeroIdentificacion.trim()
              ? { tipo: tipoIdentificacion, numero: numeroIdentificacion.trim() }
              : undefined,
          calificacion: calificacion.trim() || undefined,
        });
        guardarPaso({ emisionId: preparada.emision.id, mensajeAFirmar: preparada.mensajeAFirmar });
        estado = { ...estado, fase: 1, emision: preparada.emision, mensajeAFirmar: preparada.mensajeAFirmar };
        setProceso(estado);
      }
      const emisionId = estado.emision?.id ?? retomarId;
      if (!emisionId) throw new Error("No se encontró la emisión. Empieza de nuevo.");
      if (estado.fase === 1) {
        if (!estado.mensajeAFirmar) throw new Error("Falta la credencial preparada. Empieza de nuevo.");
        const firmante = await obtenerFirmante();
        const firma = await firmante.firmarMensaje(estado.mensajeAFirmar);
        const firmada = await api.firmarEmision(emisionId, firma);
        guardarPaso({ emisionId, mensajeAFirmar: estado.mensajeAFirmar, transaccion: firmada.transaccion });
        estado = { ...estado, fase: 2, emision: firmada.emision, transaccion: firmada.transaccion };
        setProceso(estado);
      }
      if (estado.fase === 2) {
        if (!estado.transaccion) throw new Error("Falta la transacción de anclaje. Empieza de nuevo.");
        const firmante = await obtenerFirmante();
        const xdr = await firmante.firmarTransaccion(estado.transaccion.xdr, estado.transaccion.networkPassphrase);
        const emitida = await api.enviarEmision(emisionId, xdr);
        olvidarPaso(emisionId);
        estado = { ...estado, fase: 3, emision: emitida };
      }
      setProceso({ ...estado, enCurso: false });
    } catch (e) {
      setProceso({ ...estado, enCurso: false, error: mensajeError(e) });
    }
  }

  function iniciar() {
    if (!revisar()) return;
    void ejecutar(PROCESO_INICIAL);
  }

  function empezarOtra() {
    setProceso(null);
    setTitularElegido("");
    setDidPegado("");
    setNombreTitular("");
    setTipoIdentificacion("");
    setNumeroIdentificacion("");
    setCalificacion("");
    setErrores({});
    if (parametros.size > 0) router.replace("/emitir");
  }

  const cargando = (plantillas.cargando && !plantillas.datos) || (titulares.cargando && !titulares.datos);
  const errorCarga = plantillas.error ?? titulares.error;

  return (
    <>
      <EncabezadoPagina
        titulo="Emitir credencial"
        descripcion="Elige la plantilla y el titular, revisa la credencial y fírmala con la cuenta de tu institución."
      />
      {errorCarga && (
        <ErrorCarga
          mensaje={errorCarga}
          alReintentar={() => {
            plantillas.recargar();
            titulares.recargar();
          }}
        />
      )}
      {cargando && <Cargando texto="Cargando plantillas y titulares" />}
      {correccionDe && !proceso && (
        <Aviso tipo="info" titulo="Corrección de una credencial revocada" className="mb-6">
          La credencial anterior ya fue revocada. Revisa los datos y emite la credencial corregida.
        </Aviso>
      )}
      {retomarId && !proceso && emisionRetomada && (
        <Aviso tipo="info" titulo="Retomando una emisión sin terminar" className="mb-6">
          Esta pestaña ya no tiene los pasos pendientes de esa emisión, así que se preparará de nuevo con
          la misma plantilla y titular.
        </Aviso>
      )}
      {!cargando && plantillas.datos && activas.length === 0 && !proceso && (
        <Vacio
          icono={<LayoutTemplate aria-hidden />}
          titulo="Primero necesitas una plantilla"
          accion={<EnlaceBoton href="/plantillas/nueva">Crear plantilla</EnlaceBoton>}
        >
          Toda credencial parte de una plantilla con los resultados de aprendizaje y el contexto del curso.
        </Vacio>
      )}

      {(activas.length > 0 || proceso) && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-start">
          <Panel>
            <fieldset disabled={bloqueado} className="flex flex-col gap-5 disabled:opacity-80">
              <legend className="sr-only">Datos de la emisión</legend>
              <Campo
                etiqueta="Plantilla"
                error={errores.plantilla}
                ayuda={<EnlaceTexto href="/plantillas/nueva">Crear otra plantilla</EnlaceTexto>}
              >
                {(props) => (
                  <Selector {...props} value={idPlantilla} onChange={(e) => setPlantillaId(e.target.value)}>
                    <option value="" disabled>
                      Elige una plantilla
                    </option>
                    {activas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (versión {p.version})
                      </option>
                    ))}
                  </Selector>
                )}
              </Campo>
              <Campo
                etiqueta="Titular"
                error={seleccion === OTRO_DID ? undefined : errores.titular}
                ayuda={
                  inscritos.length === 0 ? (
                    <>
                      No hay titulares inscritos. Pega un DID o{" "}
                      <EnlaceTexto href="/titulares">inscribe a un titular</EnlaceTexto>.
                    </>
                  ) : undefined
                }
              >
                {(props) => (
                  <Selector
                    {...props}
                    value={seleccion || (emisionRetomada ? emisionRetomada.titularDid : "")}
                    onChange={(e) => {
                      setTitularElegido(e.target.value);
                      if (e.target.value === OTRO_DID) setDidPegado(textoPegado);
                    }}
                  >
                    <option value="" disabled>
                      Elige un titular
                    </option>
                    {inscritos.map((t) => (
                      <option key={t.id} value={t.did}>
                        {t.did}
                      </option>
                    ))}
                    {emisionRetomada && !inscritos.some((t) => t.did === emisionRetomada.titularDid) && (
                      <option value={emisionRetomada.titularDid}>{emisionRetomada.titularDid}</option>
                    )}
                    <option value={OTRO_DID}>Pegar otro DID</option>
                  </Selector>
                )}
              </Campo>
              {seleccion === OTRO_DID && (
                <Campo
                  etiqueta="DID del titular"
                  error={errores.titular}
                  ayuda="La persona lo copia desde su Digital Wallet."
                >
                  {(props) => (
                    <Entrada
                      {...props}
                      value={textoPegado}
                      onChange={(e) => {
                        setDidPegado(e.target.value);
                        if (titularElegido !== OTRO_DID) setTitularElegido(OTRO_DID);
                      }}
                      placeholder="did:stellar:testnet:G..."
                      spellCheck={false}
                      autoCapitalize="off"
                      autoComplete="off"
                      className="font-mono text-sm"
                    />
                  )}
                </Campo>
              )}
              <Campo
                etiqueta="Nombre completo del titular"
                error={errores.nombre}
                ayuda="Tal como aparece en los registros de tu institución."
              >
                {(props) => (
                  <Entrada
                    {...props}
                    value={nombreTitular}
                    maxLength={200}
                    autoComplete="off"
                    onChange={(e) => setNombreTitular(e.target.value)}
                  />
                )}
              </Campo>
              <div className="grid gap-5">
                <Campo etiqueta="Identificación" opcional error={errores.identificacion}>
                  {(props) => (
                    <Selector
                      {...props}
                      value={tipoIdentificacion}
                      onChange={(e) => setTipoIdentificacion(e.target.value as TipoIdentificacion | "")}
                    >
                      <option value="">Sin identificación</option>
                      {TIPOS_IDENTIFICACION.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {ETIQUETAS_TIPO_IDENTIFICACION[tipo]}
                        </option>
                      ))}
                    </Selector>
                  )}
                </Campo>
                <Campo etiqueta="Número de documento" opcional={!tipoIdentificacion}>
                  {(props) => (
                    <Entrada
                      {...props}
                      value={numeroIdentificacion}
                      maxLength={40}
                      disabled={!tipoIdentificacion}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={tipoIdentificacion === "cedula" ? "1-1234-0567" : undefined}
                      onChange={(e) => setNumeroIdentificacion(e.target.value)}
                      className="font-mono text-sm"
                    />
                  )}
                </Campo>
              </div>
              <p className="-mt-2 text-[12.5px] text-tinta-suave">
                El nombre y la identificación solo viajan dentro de la credencial. La plataforma no los guarda
                aparte y el titular decide si los muestra.
              </p>
              <Campo
                etiqueta="Calificación"
                opcional
                ayuda="Por ejemplo, 95/100 o Aprobado. El titular decide si la muestra al presentar la credencial."
              >
                {(props) => (
                  <Entrada
                    {...props}
                    value={calificacion}
                    maxLength={200}
                    onChange={(e) => setCalificacion(e.target.value)}
                  />
                )}
              </Campo>
            </fieldset>
            {!proceso && (
              <div className="mt-6">
                <Boton anchoCompleto onClick={iniciar} icono={<Send aria-hidden className="size-4" />}>
                  Emitir credencial
                </Boton>
                <p className="mt-2 text-sm text-tinta-tenue">
                  Tu wallet te pedirá dos aprobaciones: la firma de la credencial y la transacción de anclaje.
                </p>
              </div>
            )}
          </Panel>

          <div className="flex min-w-0 flex-col gap-6">
            {proceso && (
              <Panel aria-live="polite" className="flex flex-col gap-5">
                <h2 className="text-lg font-semibold text-tinta">
                  {proceso.fase >= 3 ? "Credencial emitida" : "Emisión en curso"}
                </h2>
                <Pasos pasos={PASOS} actual={proceso.fase >= 3 ? PASOS.length : proceso.fase} />
                {proceso.fase < 3 && (
                  <p className="text-sm text-tinta-suave">
                    {proceso.enCurso && proceso.fase > 0 ? "Revisa tu wallet y aprueba la solicitud. " : ""}
                    {EXPLICACION[proceso.fase]}
                  </p>
                )}
                {proceso.error && (
                  <Aviso
                    tipo="error"
                    titulo={`No se pudo completar el paso ${PASOS[proceso.fase]?.toLowerCase() ?? ""}`}
                    accion={
                      <div className="flex flex-wrap gap-2">
                        <Boton
                          tamano="sm"
                          icono={<RefreshCw aria-hidden className="size-4" />}
                          onClick={() => void ejecutar(proceso)}
                        >
                          Reintentar este paso
                        </Boton>
                        {proceso.fase === 0 && (
                          <Boton tamano="sm" variante="secundario" onClick={() => setProceso(null)}>
                            Cambiar los datos
                          </Boton>
                        )}
                      </div>
                    }
                  >
                    {proceso.error}
                    {proceso.fase > 0 && " Lo que ya hiciste se conserva: el reintento sigue desde este paso."}
                  </Aviso>
                )}
                {proceso.fase >= 3 && proceso.emision && (
                  <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                    <Sello estado="valida" tamano={128} estampar />
                    <div className="flex min-w-0 flex-col gap-3">
                      <p className="text-tinta-suave">
                        La credencial está firmada por {emisor.nombre}, su huella quedó anclada en Stellar y
                        ya aparece en la wallet del titular.
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <EnlaceTexto href={`/emisiones/${proceso.emision.id}`}>Ver detalle de la emisión</EnlaceTexto>
                        {proceso.emision.txHash && (
                          <EnlaceTransaccion txHash={proceso.emision.txHash}>
                            Ver transacción en stellar.expert
                          </EnlaceTransaccion>
                        )}
                      </div>
                      <div>
                        <Boton variante="secundario" onClick={empezarOtra}>
                          Emitir otra credencial
                        </Boton>
                      </div>
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {plantilla && (proceso === null || proceso.fase < 3) ? (
              <section aria-labelledby="titulo-vista-previa" className="flex flex-col gap-3">
                <h2 id="titulo-vista-previa" className="text-lg font-semibold text-tinta">
                  Vista previa
                </h2>
                <DocumentoCredencial
                  emisor={emisor.nombre}
                  logro={plantilla.nombre}
                  descripcion={plantilla.descripcion}
                  emitidaEn={hoy}
                  estado="pendiente"
                  pie={
                    <ListaDatos
                      datos={[
                        {
                          termino: "Nombre del titular",
                          valor: nombreTitular.trim() || <span className="text-tinta-tenue">Sin escribir</span>,
                        },
                        ...(tipoIdentificacion && numeroIdentificacion.trim()
                          ? [
                              {
                                termino: ETIQUETAS_TIPO_IDENTIFICACION[tipoIdentificacion],
                                valor: <span className="font-mono text-sm">{numeroIdentificacion.trim()}</span>,
                              },
                            ]
                          : []),
                        {
                          termino: "DID del titular",
                          valor: titularDid ? (
                            <Identificador valor={titularDid} etiqueta="Copiar DID" />
                          ) : (
                            <span className="text-tinta-tenue">Sin elegir</span>
                          ),
                        },
                        {
                          termino: "Resultados de aprendizaje",
                          valor: <ListaCorta elementos={plantilla.resultadosAprendizaje} />,
                        },
                        ...(plantilla.temasEvaluados.length > 0
                          ? [{ termino: "Temas evaluados", valor: <ListaCorta elementos={plantilla.temasEvaluados} /> }]
                          : []),
                        { termino: "Contexto formativo", valor: resumenContexto(plantilla.contexto) },
                        ...(calificacion.trim() ? [{ termino: "Calificación", valor: calificacion.trim() }] : []),
                        { termino: "Vigencia", valor: vigencia(plantilla.vigenciaMeses) },
                      ]}
                    />
                  }
                />
                <p className="text-sm text-tinta-tenue">
                  Nombre, identificación, resultados, temas, contexto y calificación viajan como atributos
                  que el titular puede mostrar u ocultar al presentar la credencial.
                </p>
              </section>
            ) : (
              !proceso && (
                <Panel className="text-tinta-suave">
                  Elige una plantilla para ver cómo quedará la credencial.
                </Panel>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}
