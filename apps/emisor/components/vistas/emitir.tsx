"use client";

import type { Emision, Plantilla } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { ETIQUETAS_NIVEL } from "@repo/credenciales";
import { abreviar, Aviso, Boton, Cargando, cn } from "@repo/ui";
import { Check, ClipboardPaste, FileUp, LoaderCircle, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { env } from "../../lib/env";
import { mensajeError } from "../../lib/errores";
import { useConsulta } from "../../lib/use-consulta";
import { useFirmante } from "../../lib/use-firmante";
import { validarDid } from "../../lib/validacion";
import { useEmisor } from "../acceso";
import { EnlaceTexto, ErrorCarga } from "../comun";
import { VistaPreviaCredencial } from "../vista-previa-credencial";
import { VistaEmitirUna } from "./emitir-una";

const PASOS = ["Plantilla", "Titulares", "Revisión y firma"] as const;

interface FilaDestino {
  clave: number;
  did: string;
  calificacion: string;
}

type EstadoFila = "espera" | "firmando" | "anclando" | "lista" | "error";
interface Resultado {
  did: string;
  estado: EstadoFila;
  emision?: Emision;
  error?: string;
}

let siguienteClave = 1;
const fila = (did = "", calificacion = ""): FilaDestino => ({ clave: siguienteClave++, did, calificacion });

/** Lee un CSV con columna de DID y, opcional, de calificación. */
function leerCsv(texto: string): FilaDestino[] {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lineas.length === 0) return [];
  const sep = lineas[0]!.includes(";") ? ";" : ",";
  const celdas = (l: string) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  const cabecera = celdas(lineas[0]!).map((c) => c.toLowerCase());
  const tieneCabecera = !cabecera.some((c) => c.startsWith("did:"));
  const iDid = tieneCabecera ? Math.max(0, cabecera.findIndex((c) => c.includes("did"))) : 0;
  const iCal = tieneCabecera ? cabecera.findIndex((c) => c.startsWith("calif") || c.includes("nota")) : 1;
  return (tieneCabecera ? lineas.slice(1) : lineas).map((l) => {
    const c = celdas(l);
    return fila(c[iDid] ?? "", iCal >= 0 ? (c[iCal] ?? "") : "");
  });
}

export function VistaEmitir() {
  const parametros = useSearchParams();
  // Retomar una emisión sin terminar sigue el flujo de a una credencial.
  if (parametros.get("emision")) return <VistaEmitirUna />;
  return <EmitirEnLote />;
}

function EmitirEnLote() {
  const { api } = useSesion();
  const emisor = useEmisor();
  const parametros = useSearchParams();
  const { obtenerFirmante } = useFirmante();
  const datos = useConsulta(
    () => Promise.all([api.listarPlantillas(), api.listarTitulares(emisor.id), api.listarEmisiones()]),
    `emitir:${emisor.id}`,
  );
  const [plantillas = [], inscritos = [], emisiones = []] = datos.datos ?? [];
  const activas = plantillas.filter((p) => !p.archivada);

  const deUrl = (parametros.get("titulares") ?? parametros.get("titular") ?? "").split(",").filter(Boolean);
  const [paso, setPaso] = useState(parametros.get("plantilla") ? (deUrl.length ? 2 : 1) : 0);
  const [plantillaId, setPlantillaId] = useState(parametros.get("plantilla") ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [filas, setFilas] = useState<FilaDestino[]>(() => (deUrl.length ? deUrl.map((d) => fila(d)) : [fila()]));
  const [conCalificacion, setConCalificacion] = useState(false);
  const [inscribir, setInscribir] = useState(true);
  const [pegando, setPegando] = useState(false);
  const [textoPegado, setTextoPegado] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorPaso, setErrorPaso] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [enCurso, setEnCurso] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  const plantilla: Plantilla | undefined = activas.find((p) => p.id === plantillaId);
  const emitidasPorPlantilla = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of emisiones) if (e.estado === "emitida" || e.estado === "revocada") mapa.set(e.plantillaId, (mapa.get(e.plantillaId) ?? 0) + 1);
    return mapa;
  }, [emisiones]);

  const conDid = filas.filter((f) => f.did.trim());
  const erroresFila = new Map<number, string>();
  conDid.forEach((f, i) => {
    const did = f.did.trim();
    const problema = validarDid(did);
    if (problema) erroresFila.set(f.clave, "DID no válido para esta red.");
    else {
      const previa = conDid.findIndex((g) => g.did.trim() === did);
      if (previa < i) erroresFila.set(f.clave, `Repetido en la fila ${previa + 1}.`);
    }
    const cal = f.calificacion.trim();
    if (conCalificacion && cal.length > 50) erroresFila.set(f.clave, "La calificación es muy larga.");
  });
  const inscritosDids = new Set(inscritos.map((t) => t.did));
  const nuevos = conDid.filter((f) => !inscritosDids.has(f.did.trim()) && !erroresFila.has(f.clave)).length;

  function agregar(lista: FilaDestino[], origen: string) {
    const actuales = filas.filter((f) => f.did.trim());
    const sinRepetir = lista.filter((f) => f.did && !actuales.some((a) => a.did.trim() === f.did.trim()));
    setFilas([...actuales, ...sinRepetir, ...(actuales.length + sinRepetir.length === 0 ? [fila()] : [])]);
    if (sinRepetir.some((f) => f.calificacion)) setConCalificacion(true);
    setAviso(`${origen}: ${sinRepetir.length} ${sinRepetir.length === 1 ? "titular agregado" : "titulares agregados"}${lista.length - sinRepetir.length ? `, ${lista.length - sinRepetir.length} ya estaban` : ""}.`);
  }

  function cargarArchivo(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    void f.text().then((t) => agregar(leerCsv(t), `CSV ${f.name}`));
  }

  function avanzar() {
    setErrorPaso(null);
    if (paso === 0) {
      if (!plantilla) return setErrorPaso("Elija una plantilla activa.");
      setPaso(1);
    } else if (paso === 1) {
      if (conDid.length === 0) return setErrorPaso("Agregue al menos un titular.");
      if (erroresFila.size > 0) return setErrorPaso("Corrija las filas marcadas antes de seguir.");
      setPaso(2);
    }
    window.scrollTo({ top: 0 });
  }

  async function emitir(soloFallidas = false) {
    if (!plantilla) return;
    const destinos = soloFallidas
      ? conDid.filter((f) => resultados?.find((r) => r.did === f.did.trim())?.estado === "error")
      : conDid;
    const base: Resultado[] = soloFallidas
      ? resultados!
      : conDid.map((f) => ({ did: f.did.trim(), estado: "espera" as EstadoFila }));
    let actuales = base.map((r) => (destinos.some((d) => d.did.trim() === r.did) ? { ...r, estado: "espera" as EstadoFila, error: undefined } : r));
    const poner = (did: string, cambio: Partial<Resultado>) => {
      actuales = actuales.map((r) => (r.did === did ? { ...r, ...cambio } : r));
      setResultados(actuales);
    };
    setResultados(actuales);
    setEnCurso(true);
    try {
      const firmante = await obtenerFirmante();
      for (const destino of destinos) {
        const did = destino.did.trim();
        try {
          poner(did, { estado: "firmando" });
          if (inscribir && !inscritosDids.has(did)) {
            await api.inscribirTitular(emisor.id, did).catch(() => undefined);
          }
          const preparada = await api.prepararEmision({
            plantillaId: plantilla.id,
            titularDid: did,
            calificacion: conCalificacion && destino.calificacion.trim() ? destino.calificacion.trim() : undefined,
          });
          const firma = await firmante.firmarMensaje(preparada.mensajeAFirmar);
          const firmada = await api.firmarEmision(preparada.emision.id, firma);
          poner(did, { estado: "anclando", emision: firmada.emision });
          const xdr = await firmante.firmarTransaccion(firmada.transaccion.xdr, firmada.transaccion.networkPassphrase);
          const emitida = await api.enviarEmision(preparada.emision.id, xdr);
          poner(did, { estado: "lista", emision: emitida });
        } catch (e) {
          poner(did, { estado: "error", error: mensajeError(e) });
        }
      }
    } catch (e) {
      // No se pudo abrir la llave (p. ej. se canceló la contraseña).
      for (const d of destinos) poner(d.did.trim(), { estado: "error", error: mensajeError(e) });
    } finally {
      setEnCurso(false);
      datos.recargar();
    }
  }

  function reiniciar(conPlantilla: boolean) {
    setResultados(null);
    setFilas([fila()]);
    setConCalificacion(false);
    setAviso(null);
    setPaso(conPlantilla ? 1 : 0);
    if (!conPlantilla) setPlantillaId("");
  }

  if (datos.error) return <ErrorCarga mensaje={datos.error} alReintentar={datos.recargar} />;
  if (!datos.datos) return <Cargando texto="Cargando plantillas y titulares" />;

  const listas = resultados?.filter((r) => r.estado === "lista").length ?? 0;
  const fallidas = resultados?.filter((r) => r.estado === "error").length ?? 0;
  const terminado = resultados !== null && !enCurso;

  return (
    <div className="flex flex-col gap-5">
      <div className="text-[13px] text-tinta-suave">Portal del emisor › Emitir credenciales › Paso {Math.min(paso + 1, 3)} de 3</div>
      <div className={cn("grid items-start gap-6", paso >= 1 && plantilla ? "xl:grid-cols-[230px_minmax(0,1fr)_320px] lg:grid-cols-[230px_minmax(0,1fr)]" : "lg:grid-cols-[230px_minmax(0,1fr)]")}>
        <ol className="flex gap-1 overflow-x-auto rounded-xl border border-linea bg-superficie p-3 lg:flex-col lg:p-4">
          {PASOS.map((p, i) => (
            <li key={p} aria-current={i === paso ? "step" : undefined} className={cn("grid shrink-0 grid-cols-[28px_auto] items-center gap-2.5 rounded-lg p-2 text-sm", i === paso && "bg-marino-claro font-medium")}>
              <span
                aria-hidden
                className={cn(
                  "grid size-[26px] place-items-center rounded-full border text-xs font-bold",
                  i === paso && "border-tec-azul bg-tec-azul text-white",
                  i < paso && "border-sello bg-sello-claro text-sello",
                  i > paso && "border-linea text-tinta-tenue",
                )}
              >
                {i < paso ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ol>

        <div className="flex min-w-0 flex-col gap-5 rounded-xl border border-linea bg-superficie p-5 sm:p-7">
          {paso === 0 && (
            <>
              <Titulo texto="¿Qué va a emitir?">Elija la plantilla de la credencial.</Titulo>
              {activas.length === 0 ? (
                <Aviso tipo="advertencia" titulo="No hay plantillas activas">
                  <EnlaceTexto href="/plantillas/nueva">Crear una plantilla</EnlaceTexto>
                </Aviso>
              ) : (
                <>
                  <div className="relative max-w-[360px]">
                    <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tinta-tenue" />
                    <input aria-label="Buscar plantilla" placeholder="Buscar plantilla" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="h-10 w-full rounded-control border border-linea pl-9 pr-3" />
                  </div>
                  <div role="radiogroup" aria-label="Plantillas" className="flex max-h-[460px] flex-col gap-2 overflow-auto p-0.5">
                    {activas
                      .filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
                      .map((p) => (
                        <label key={p.id} className={cn("grid cursor-pointer grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] border px-3.5 py-3", plantillaId === p.id ? "border-tec-azul shadow-[inset_0_0_0_1px_var(--color-tec-azul)]" : "border-linea")}>
                          <input type="radio" name="plantilla" checked={plantillaId === p.id} onChange={() => setPlantillaId(p.id)} className="size-[18px] accent-[var(--color-tec-azul)]" />
                          <span className="min-w-0">
                            <b className="block font-medium">{p.nombre}</b>
                            <span className="text-[12.5px] text-tinta-suave">
                              {ETIQUETAS_NIVEL[p.contexto.nivel]} · {p.contexto.horas} h{p.carpeta ? ` · ${p.carpeta.replaceAll("/", " › ")}` : ""}
                            </span>
                          </span>
                          <span className="cifras text-[12.5px] text-tinta-suave">{emitidasPorPlantilla.get(p.id) ?? 0} emitidas</span>
                        </label>
                      ))}
                  </div>
                </>
              )}
            </>
          )}

          {paso === 1 && (
            <>
              <Titulo texto="¿A quién se la emite?">Pegue el DID de la Digital Wallet de cada titular, cárguelos de un CSV o elíjalos de sus inscritos.</Titulo>
              {aviso && (
                <Aviso tipo="exito" className="py-2.5">
                  {aviso}
                </Aviso>
              )}
              <div className="flex flex-wrap gap-2">
                <Boton type="button" tamano="sm" variante="secundario" icono={<ClipboardPaste aria-hidden className="size-4" />} onClick={() => setPegando(true)}>
                  Pegar varios DIDs
                </Boton>
                <Boton type="button" tamano="sm" variante="secundario" icono={<FileUp aria-hidden className="size-4" />} onClick={() => archivo.current?.click()}>
                  Cargar CSV
                </Boton>
                <input ref={archivo} type="file" accept=".csv,text/csv,text/plain" hidden onChange={cargarArchivo} />
                {inscritos.length > 0 && (
                  <Boton type="button" tamano="sm" variante="secundario" onClick={() => agregar(inscritos.map((t) => fila(t.did)), "Inscritos")}>
                    Agregar todos los inscritos ({inscritos.length})
                  </Boton>
                )}
              </div>
              <p className="text-xs text-tinta-tenue">
                CSV: una columna <code className="font-mono">did</code> y, si quiere, <code className="font-mono">calificacion</code>.
              </p>
              {pegando && (
                <div className="flex flex-col gap-2 rounded-[9px] border border-dashed border-linea bg-hundido p-3.5">
                  <label htmlFor="pegados" className="text-sm font-semibold">
                    Un DID por línea
                  </label>
                  <textarea id="pegados" rows={4} value={textoPegado} onChange={(e) => setTextoPegado(e.target.value)} spellCheck={false} className="rounded-control border border-linea bg-superficie p-2 font-mono text-[12.5px]" placeholder={`did:stellar:${env.stellarNetwork}:G…`} />
                  <div className="flex gap-2">
                    <Boton
                      type="button"
                      tamano="sm"
                      onClick={() => {
                        agregar(textoPegado.split(/[\s,;]+/).filter(Boolean).map((d) => fila(d)), "Pegados");
                        setTextoPegado("");
                        setPegando(false);
                      }}
                    >
                      Agregar
                    </Boton>
                    <Boton type="button" tamano="sm" variante="fantasma" onClick={() => setPegando(false)}>
                      Cancelar
                    </Boton>
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={conCalificacion} onChange={(e) => setConCalificacion(e.target.checked)} className="size-4 accent-[var(--color-tec-azul)]" />
                Incluir calificación (el titular decide si la muestra)
              </label>
              <div className="overflow-x-auto rounded-[9px] border border-linea px-2">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-[11.5px] uppercase tracking-[0.06em] text-tinta-tenue">
                      <th className="w-8 border-b border-linea py-2 font-medium">#</th>
                      <th className="border-b border-linea px-1.5 py-2 font-medium">DID del titular</th>
                      {conCalificacion && <th className="w-32 border-b border-linea px-1.5 py-2 font-medium">Calificación</th>}
                      <th className="w-10 border-b border-linea" />
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => {
                      const error = erroresFila.get(f.clave);
                      const did = f.did.trim();
                      return (
                        <tr key={f.clave} className="align-top">
                          <td className="border-b border-linea py-2.5 text-xs text-tinta-tenue">{i + 1}</td>
                          <td className="border-b border-linea px-1.5 py-1.5">
                            <input
                              aria-label={`DID del titular ${i + 1}`}
                              value={f.did}
                              spellCheck={false}
                              placeholder={`did:stellar:${env.stellarNetwork}:G…`}
                              onChange={(e) => setFilas(filas.map((x) => (x.clave === f.clave ? { ...x, did: e.target.value } : x)))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  setFilas([...filas, fila()]);
                                }
                              }}
                              className={cn("h-9 w-full rounded-control border px-2 font-mono text-[12.5px]", error ? "border-lacre" : "border-linea")}
                            />
                            {error ? (
                              <span className="mt-1 block text-xs text-lacre">{error}</span>
                            ) : did && !inscritosDids.has(did) ? (
                              <span className="mt-1 block text-xs text-tinta-tenue">No está inscrito todavía.</span>
                            ) : null}
                          </td>
                          {conCalificacion && (
                            <td className="border-b border-linea px-1.5 py-1.5">
                              <input aria-label={`Calificación del titular ${i + 1}`} value={f.calificacion} placeholder="95/100" onChange={(e) => setFilas(filas.map((x) => (x.clave === f.clave ? { ...x, calificacion: e.target.value } : x)))} className="h-9 w-full rounded-control border border-linea px-2" />
                            </td>
                          )}
                          <td className="border-b border-linea py-1.5 text-center">
                            <button type="button" onClick={() => setFilas(filas.length > 1 ? filas.filter((x) => x.clave !== f.clave) : [fila()])} className="grid size-9 place-items-center rounded-control text-tinta-tenue hover:text-lacre">
                              <Trash2 aria-hidden className="size-4" />
                              <span className="sr-only">Quitar fila {i + 1}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button type="button" onClick={() => setFilas([...filas, fila()])} className="my-2 inline-flex items-center gap-1 text-sm font-medium text-tec-azul">
                  <Plus aria-hidden className="size-4" /> Agregar fila
                </button>
              </div>
              <p className="text-[13px] text-tinta-suave">
                {conDid.length} {conDid.length === 1 ? "titular" : "titulares"}
                {erroresFila.size > 0 && <span className="text-lacre"> · {erroresFila.size} con problemas</span>}
              </p>
              {nuevos > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={inscribir} onChange={(e) => setInscribir(e.target.checked)} className="size-4 accent-[var(--color-tec-azul)]" />
                  {nuevos === 1 ? "Inscribir al titular nuevo en Titulares" : `Inscribir a los ${nuevos} titulares nuevos en Titulares`}
                </label>
              )}
            </>
          )}

          {paso === 2 && plantilla && !resultados && (
            <>
              <Titulo texto="Revise y firme">Al firmar, cada credencial queda anclada en Stellar y llega a la wallet del titular.</Titulo>
              <div className="grid gap-2.5 sm:grid-cols-3">
                <Resumen etiqueta="Plantilla" valor={plantilla.nombre} />
                <Resumen etiqueta="Titulares" valor={String(conDid.length)} />
                <Resumen etiqueta="Vigencia" valor={plantilla.vigenciaMeses ? `${plantilla.vigenciaMeses} meses` : "No vence"} />
              </div>
              <ul className="flex max-h-64 flex-col overflow-auto rounded-[9px] border border-linea">
                {conDid.map((f, i) => (
                  <li key={f.clave} className="flex justify-between gap-3 border-b border-linea px-3 py-2 text-[13px] last:border-b-0">
                    <span className="font-mono">
                      {i + 1}. {abreviar(f.did.trim(), 24, 6)}
                    </span>
                    {conCalificacion && f.calificacion && <span className="text-tinta-suave">{f.calificacion}</span>}
                  </li>
                ))}
              </ul>
              <Aviso tipo="advertencia" titulo="Una credencial emitida no se puede modificar">
                Si hay un error tendrá que revocarla y emitir otra.
              </Aviso>
            </>
          )}

          {resultados && (
            <>
              <Titulo texto={terminado ? (fallidas ? `${listas} de ${resultados.length} credenciales emitidas` : `${listas} ${listas === 1 ? "credencial emitida" : "credenciales emitidas"}`) : "Emitiendo credenciales"}>
                {terminado ? "Cada credencial ya está en la wallet de su titular y se puede verificar." : "No cierre esta página hasta que termine."}
              </Titulo>
              <div className="flex flex-wrap gap-2.5">
                {[
                  ["Firmando credenciales", resultados.some((r) => r.estado !== "espera")],
                  ["Registrando huella en Stellar", resultados.some((r) => r.estado === "anclando" || r.estado === "lista")],
                  ["Entregando a titulares", terminado && listas > 0],
                ].map(([t, hecho]) => (
                  <span key={t as string} className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[13px]", hecho ? "border-sello bg-sello-claro text-sello" : "border-linea text-tinta-suave")}>
                    {hecho ? <Check aria-hidden className="size-3.5" /> : null}
                    {t}
                  </span>
                ))}
              </div>
              <ul role="status" className="flex flex-col">
                {resultados.map((r) => (
                  <li key={r.did} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-linea px-1 py-2.5 text-sm">
                    {r.estado === "lista" ? (
                      <Check aria-hidden className="size-4 text-sello" />
                    ) : r.estado === "error" ? (
                      <X aria-hidden className="size-4 text-lacre" />
                    ) : r.estado === "espera" ? (
                      <span aria-hidden className="size-2 justify-self-center rounded-full bg-linea" />
                    ) : (
                      <LoaderCircle aria-hidden className="size-4 animate-spin text-tec-azul" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[12.5px]">{abreviar(r.did, 24, 6)}</span>
                      {r.error && <span className="block text-xs text-lacre">{r.error}</span>}
                    </span>
                    <span className="text-[12.5px] text-tinta-suave">
                      {r.estado === "lista" && r.emision ? (
                        <Link href={`/emisiones/${r.emision.id}`} className="font-mono text-tec-azul underline">
                          {r.emision.id.slice(0, 8).toUpperCase()}
                        </Link>
                      ) : r.estado === "firmando" ? (
                        "Firmando"
                      ) : r.estado === "anclando" ? (
                        "Anclando"
                      ) : r.estado === "error" ? (
                        "Falló"
                      ) : (
                        "En espera"
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {errorPaso && <Aviso tipo="error">{errorPaso}</Aviso>}

          <div className="flex flex-wrap justify-between gap-3 border-t border-linea pt-5">
            {resultados ? (
              terminado && (
                <>
                  <Boton variante="secundario" onClick={() => reiniciar(false)}>
                    Emitir otra plantilla
                  </Boton>
                  <div className="flex flex-wrap gap-2">
                    {fallidas > 0 && (
                      <Boton variante="secundario" onClick={() => void emitir(true)}>
                        Reintentar las {fallidas} fallidas
                      </Boton>
                    )}
                    <Boton onClick={() => reiniciar(true)}>Emitir otra con esta plantilla</Boton>
                  </div>
                </>
              )
            ) : (
              <>
                {paso > 0 ? (
                  <Boton variante="secundario" onClick={() => setPaso(paso - 1)}>
                    Atrás
                  </Boton>
                ) : (
                  <span />
                )}
                {paso < 2 ? (
                  <Boton onClick={avanzar}>Siguiente</Boton>
                ) : (
                  <Boton onClick={() => void emitir()}>
                    Firmar y emitir {conDid.length === 1 ? "1 credencial" : `${conDid.length} credenciales`}
                  </Boton>
                )}
              </>
            )}
          </div>
        </div>

        {paso >= 1 && plantilla && (
          <aside className="hidden flex-col gap-2.5 xl:flex xl:sticky xl:top-24">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-tinta-tenue">Vista previa</span>
            <VistaPreviaCredencial
              emisor={emisor.nombre}
              nombre={plantilla.nombre}
              descripcion={plantilla.descripcion}
              resultados={plantilla.resultadosAprendizaje}
              temas={plantilla.temasEvaluados}
              horas={plantilla.contexto.horas}
              nivel={plantilla.contexto.nivel}
              modalidad={plantilla.contexto.modalidad}
              vigenciaMeses={plantilla.vigenciaMeses}
              titular={conDid[0]?.did.trim()}
              calificacion={conCalificacion ? conDid[0]?.calificacion.trim() || undefined : undefined}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function Titulo({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-[1.375rem] font-bold text-tec-azul">{texto}</h1>
      <p className="mt-1.5 text-tinta-suave">{children}</p>
    </div>
  );
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[9px] border border-linea px-3.5 py-3">
      <span className="text-[12.5px] text-tinta-suave">{etiqueta}</span>
      <b className="font-medium">{valor}</b>
    </div>
  );
}
