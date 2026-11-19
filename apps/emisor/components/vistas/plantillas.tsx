"use client";

import type { Emision, Plantilla } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { ETIQUETAS_NIVEL } from "@repo/credenciales";
import { Aviso, Boton, Campo, Cargando, Dialogo, Entrada, Selector, cn } from "@repo/ui";
import { ChevronRight, FileText, Folder, FolderPlus, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { mensajeError } from "../../lib/errores";
import { useConsulta } from "../../lib/use-consulta";
import { EnlaceBoton, ErrorCarga } from "../comun";

const RAIZ = "";
const padre = (ruta: string) => (ruta.includes("/") ? ruta.slice(0, ruta.lastIndexOf("/")) : RAIZ);
const nombreDe = (ruta: string) => ruta.slice(ruta.lastIndexOf("/") + 1);
const dentroDe = (ruta: string | null, carpeta: string) => !!ruta && (ruta === carpeta || ruta.startsWith(`${carpeta}/`));

function hace(fecha: string): string {
  const min = Math.round((Date.now() - Date.parse(fecha)) / 60000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

type Modal =
  | { tipo: "nueva"; dentro: string }
  | { tipo: "renombrar"; ruta: string }
  | { tipo: "mover"; plantilla: Plantilla }
  | null;

export function VistaPlantillas() {
  const { api } = useSesion();
  const creada = useSearchParams().get("creada");
  const consulta = useConsulta(
    () => Promise.all([api.listarPlantillas(), api.listarCarpetas(), api.listarEmisiones()]),
    "plantillas",
  );
  const [plantillas = [], carpetas = [], emisiones = []] = consulta.datos ?? [];

  const [actual, setActual] = useState(RAIZ);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [etiquetasSel, setEtiquetasSel] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [aviso, setAviso] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [destino, setDestino] = useState<string | null>(null);

  const usoPorPlantilla = useMemo(() => {
    const mapa = new Map<string, { n: number; ultima: string | null }>();
    for (const e of emisiones as Emision[]) {
      if (e.estado !== "emitida" && e.estado !== "revocada") continue;
      const previo = mapa.get(e.plantillaId) ?? { n: 0, ultima: null };
      const f = e.emitidaEn ?? e.creadaEn;
      mapa.set(e.plantillaId, { n: previo.n + 1, ultima: !previo.ultima || f > previo.ultima ? f : previo.ultima });
    }
    return mapa;
  }, [emisiones]);

  const todasLasEtiquetas = [...new Set(plantillas.flatMap((p) => p.etiquetas))].sort((a, b) => a.localeCompare(b, "es"));
  const archivadas = plantillas.filter((p) => p.archivada);
  const filtrando = busqueda.trim() !== "" || etiquetasSel.length > 0;
  const subcarpetas = carpetas.filter((c) => padre(c) === actual);

  const visibles = plantillas
    .filter((p) => p.archivada === verArchivadas)
    .filter((p) => (filtrando ? (actual === RAIZ ? true : dentroDe(p.carpeta, actual)) : (p.carpeta ?? RAIZ) === actual))
    .filter((p) => etiquetasSel.every((t) => p.etiquetas.includes(t)))
    .filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));

  const recientes = [...plantillas]
    .filter((p) => !p.archivada)
    .sort((a, b) => (usoPorPlantilla.get(b.id)?.ultima ?? b.actualizadaEn).localeCompare(usoPorPlantilla.get(a.id)?.ultima ?? a.actualizadaEn))
    .slice(0, 4);

  function abrir(ruta: string) {
    setActual(ruta);
    const nuevas = new Set(abiertas);
    for (let r = ruta; r; r = padre(r)) nuevas.add(r);
    setAbiertas(nuevas);
  }

  async function ejecutar(accion: () => Promise<string>) {
    setAviso(null);
    try {
      setAviso({ tipo: "exito", texto: await accion() });
      consulta.recargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e) });
    }
  }

  const mover = (p: Plantilla, carpeta: string | null) =>
    ejecutar(async () => {
      await api.organizarPlantilla(p.id, { carpeta, etiquetas: p.etiquetas });
      return carpeta ? `«${p.nombre}» se movió a ${carpeta.replaceAll("/", " › ")}.` : `«${p.nombre}» quedó sin carpeta.`;
    });

  function soltar(carpeta: string) {
    return {
      onDragOver: (e: DragEvent) => {
        if (!arrastrando) return;
        e.preventDefault();
        setDestino(carpeta);
      },
      onDragLeave: () => setDestino((d) => (d === carpeta ? null : d)),
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        const p = plantillas.find((x) => x.id === arrastrando);
        setArrastrando(null);
        setDestino(null);
        if (p && (p.carpeta ?? RAIZ) !== carpeta) void mover(p, carpeta || null);
      },
    };
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-tec-azul">Plantillas</h1>
          <p className="mt-1.5 max-w-[62ch] text-tinta-suave">
            Organice sus plantillas en carpetas y etiquetas. Toda credencial se emite a partir de una plantilla.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton variante="secundario" icono={<FolderPlus aria-hidden className="size-4" />} onClick={() => setModal({ tipo: "nueva", dentro: actual })}>
            Nueva carpeta
          </Boton>
          <EnlaceBoton href={actual ? `/plantillas/nueva?carpeta=${encodeURIComponent(actual)}` : "/plantillas/nueva"} icono={<Plus aria-hidden className="size-4" />}>
            Nueva plantilla
          </EnlaceBoton>
        </div>
      </div>

      {creada && !aviso && <Aviso tipo="exito">Plantilla creada.</Aviso>}
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      {consulta.error && <ErrorCarga mensaje={consulta.error} alReintentar={consulta.recargar} />}
      {consulta.cargando && !consulta.datos && <Cargando texto="Cargando plantillas" />}

      {consulta.datos && (
        <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-1 rounded-[10px] border border-linea bg-superficie p-2.5 lg:sticky lg:top-24">
            <FilaArbol
              activa={actual === RAIZ && !filtrando}
              soltando={destino === RAIZ}
              {...soltar(RAIZ)}
              alAbrir={() => {
                setActual(RAIZ);
                setEtiquetasSel([]);
                setBusqueda("");
              }}
              icono={<FileText aria-hidden className="size-4 text-tec-azul" />}
              nombre="Todas las plantillas"
              cuenta={plantillas.filter((p) => !p.archivada).length}
            />
            <span className="px-2 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-tinta-tenue">Carpetas</span>
            {carpetas.length === 0 && <p className="px-2 text-[13px] text-tinta-tenue">Aún no hay carpetas.</p>}
            {carpetas
              .filter((c) => c.split("/").every((_, i, partes) => i === partes.length - 1 || abiertas.has(partes.slice(0, i + 1).join("/"))))
              .map((c) => {
                const nivel = c.split("/").length - 1;
                const tieneHijas = carpetas.some((x) => padre(x) === c);
                return (
                  <FilaArbol
                    key={c}
                    nivel={nivel}
                    activa={actual === c}
                    soltando={destino === c}
                    {...soltar(c)}
                    expandida={tieneHijas ? abiertas.has(c) : undefined}
                    alExpandir={() => {
                      const nuevas = new Set(abiertas);
                      if (nuevas.has(c)) nuevas.delete(c);
                      else nuevas.add(c);
                      setAbiertas(nuevas);
                    }}
                    alAbrir={() => abrir(c)}
                    icono={<Folder aria-hidden className="size-4 text-tec-azul" />}
                    nombre={nombreDe(c)}
                    cuenta={plantillas.filter((p) => !p.archivada && dentroDe(p.carpeta, c)).length}
                  />
                );
              })}
            <span className="px-2 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-tinta-tenue">Etiquetas</span>
            {todasLasEtiquetas.length === 0 ? (
              <p className="px-2 pb-2 text-[13px] text-tinta-tenue">Agregue etiquetas al editar una plantilla.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                {todasLasEtiquetas.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={etiquetasSel.includes(t)}
                    onClick={() => setEtiquetasSel(etiquetasSel.includes(t) ? etiquetasSel.filter((x) => x !== t) : [...etiquetasSel, t])}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[12.5px]",
                      etiquetasSel.includes(t) ? "border-tec-azul bg-tec-azul text-white" : "border-linea text-tinta",
                    )}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </aside>

          <div className="flex min-w-0 flex-col gap-4">
            {actual === RAIZ && !filtrando && !verArchivadas && recientes.length > 0 && (
              <section className="flex flex-col gap-2.5" aria-labelledby="titulo-recientes">
                <h2 id="titulo-recientes" className="text-[15px] font-medium text-tinta">
                  Recientes
                </h2>
                <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                  {recientes.map((p) => {
                    const uso = usoPorPlantilla.get(p.id);
                    return (
                      <Link key={p.id} href={`/plantillas/${p.id}`} className="flex flex-col gap-1 rounded-[9px] border border-linea bg-superficie p-3.5 hover:border-tec-azul">
                        <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-lacre">{p.carpeta ? nombreDe(p.carpeta) : "Sin carpeta"}</span>
                        <b className="text-sm font-medium text-tinta">{p.nombre}</b>
                        <span className="text-[12.5px] text-tinta-suave">{uso?.ultima ? `Usada ${hace(uso.ultima)}` : `Editada ${hace(p.actualizadaEn)}`}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <nav aria-label="Carpeta actual" className="flex flex-wrap items-center gap-1 text-sm">
                <button type="button" onClick={() => setActual(RAIZ)} className="rounded px-1 text-tinta-suave hover:text-tec-azul hover:underline">
                  Plantillas
                </button>
                {actual &&
                  actual.split("/").map((parte, i, partes) => {
                    const ruta = partes.slice(0, i + 1).join("/");
                    return (
                      <span key={ruta} className="flex items-center gap-1">
                        <ChevronRight aria-hidden className="size-3.5 text-tinta-tenue" />
                        {ruta === actual ? (
                          <b className="font-medium text-tinta">{parte}</b>
                        ) : (
                          <button type="button" onClick={() => setActual(ruta)} className="rounded px-1 text-tinta-suave hover:text-tec-azul hover:underline">
                            {parte}
                          </button>
                        )}
                      </span>
                    );
                  })}
                {actual && (
                  <span className="ml-2 flex gap-1">
                    <Boton tamano="sm" variante="fantasma" onClick={() => setModal({ tipo: "renombrar", ruta: actual })}>
                      Renombrar
                    </Boton>
                    <Boton
                      tamano="sm"
                      variante="fantasma"
                      onClick={() =>
                        void ejecutar(async () => {
                          await api.eliminarCarpeta(actual);
                          const borrada = actual;
                          setActual(padre(actual));
                          return `Se eliminó la carpeta ${nombreDe(borrada)}.`;
                        })
                      }
                    >
                      Eliminar
                    </Boton>
                  </span>
                )}
              </nav>
              <div role="group" aria-label="Estado" className="flex rounded-control border border-linea p-0.5">
                {[false, true].map((arch) => (
                  <button
                    key={String(arch)}
                    type="button"
                    aria-pressed={verArchivadas === arch}
                    onClick={() => setVerArchivadas(arch)}
                    className={cn("rounded-md px-3 py-1 text-[13px]", verArchivadas === arch ? "bg-tec-azul text-white" : "text-tinta")}
                  >
                    {arch ? `Archivadas (${archivadas.length})` : "Activas"}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative max-w-[360px]">
              <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tinta-tenue" />
              <Entrada aria-label="Buscar por nombre" placeholder="Buscar por nombre" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
            </div>
            {etiquetasSel.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-tinta-suave">
                Filtrando por
                {etiquetasSel.map((t) => (
                  <button key={t} type="button" onClick={() => setEtiquetasSel(etiquetasSel.filter((x) => x !== t))} className="inline-flex items-center gap-1 rounded-full border border-linea bg-hundido px-2.5 py-0.5 text-tinta">
                    #{t} <X aria-hidden className="size-3" />
                    <span className="sr-only">Quitar filtro</span>
                  </button>
                ))}
              </div>
            )}

            {!filtrando && subcarpetas.length > 0 && !verArchivadas && (
              <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]">
                {subcarpetas.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => abrir(c)}
                    {...soltar(c)}
                    className={cn(
                      "flex items-center gap-3 rounded-[9px] border bg-superficie p-3.5 text-left hover:border-tec-azul",
                      destino === c ? "border-sello bg-sello-claro" : "border-linea",
                    )}
                  >
                    <Folder aria-hidden className="size-5 shrink-0 text-tec-azul" />
                    <span>
                      <b className="block text-sm font-medium">{nombreDe(c)}</b>
                      <span className="text-[12.5px] text-tinta-suave">
                        {plantillas.filter((p) => !p.archivada && dentroDe(p.carpeta, c)).length} plantillas · {carpetas.filter((x) => padre(x) === c).length} subcarpetas
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {visibles.length === 0 && !filtrando && !verArchivadas && subcarpetas.length > 0 ? null : visibles.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-linea px-6 py-12 text-center">
                <span className="grid size-14 place-items-center rounded-[14px] border border-linea bg-hundido text-tec-azul">
                  <FileText aria-hidden className="size-6" />
                </span>
                <h2 className="text-lg font-semibold">
                  {filtrando ? "No hay plantillas que coincidan" : verArchivadas ? "No hay plantillas archivadas aquí" : actual ? "Esta carpeta está vacía" : plantillas.length ? "No hay plantillas sueltas" : "Aún no tiene plantillas"}
                </h2>
                {!filtrando && !verArchivadas && (
                  <EnlaceBoton href={actual ? `/plantillas/nueva?carpeta=${encodeURIComponent(actual)}` : "/plantillas/nueva"}>
                    {actual ? "Crear plantilla aquí" : "Crear plantilla"}
                  </EnlaceBoton>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[10px] border border-linea bg-superficie">
                <div className="hidden grid-cols-[minmax(0,1fr)_100px_auto] gap-3.5 bg-hundido px-4 py-2 text-[11.5px] font-medium uppercase tracking-[0.08em] text-tinta-tenue md:grid">
                  <span>Nombre</span>
                  <span>Emitidas</span>
                  <span className="text-right">Acciones</span>
                </div>
                {visibles.map((p) => (
                  <div
                    key={p.id}
                    draggable={!p.archivada}
                    onDragStart={() => setArrastrando(p.id)}
                    onDragEnd={() => {
                      setArrastrando(null);
                      setDestino(null);
                    }}
                    className={cn(
                      "grid items-center gap-3.5 border-t border-linea px-4 py-3 first:border-t-0 md:grid-cols-[minmax(0,1fr)_100px_auto]",
                      !p.archivada && "cursor-grab",
                      arrastrando === p.id && "opacity-50",
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span aria-hidden className="grid size-[34px] shrink-0 place-items-center rounded-lg border border-linea text-tec-azul">
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <Link href={`/plantillas/${p.id}`} className="block text-[14.5px] font-medium text-tinta hover:text-tec-azul hover:underline">
                          {p.nombre}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-tinta-suave">
                          <span>
                            {ETIQUETAS_NIVEL[p.contexto.nivel]} · {p.contexto.horas} h · v{p.version}
                          </span>
                          {p.carpeta && filtrando && <span>· {p.carpeta.replaceAll("/", " › ")}</span>}
                          {p.etiquetas.map((t) => (
                            <span key={t} className="rounded-full border border-linea px-2 text-[11.5px]">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="cifras text-sm">{usoPorPlantilla.get(p.id)?.n ?? 0}</span>
                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                      {p.archivada ? (
                        <Boton tamano="sm" variante="secundario" onClick={() => void ejecutar(async () => (await api.restaurarPlantilla(p.id), `«${p.nombre}» volvió a las activas.`))}>
                          Restaurar
                        </Boton>
                      ) : (
                        <>
                          <EnlaceBoton href={`/emitir?plantilla=${p.id}`} tamano="sm">
                            Emitir
                          </EnlaceBoton>
                          <EnlaceBoton href={`/plantillas/${p.id}`} tamano="sm" variante="secundario">
                            Editar
                          </EnlaceBoton>
                          <Boton tamano="sm" variante="secundario" onClick={() => setModal({ tipo: "mover", plantilla: p })}>
                            Mover
                          </Boton>
                          <Boton tamano="sm" variante="secundario" onClick={() => void ejecutar(async () => (await api.archivarPlantilla(p.id), `«${p.nombre}» quedó archivada. Ya no aparece al emitir.`))}>
                            Archivar
                          </Boton>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!verArchivadas && visibles.length > 0 && <p className="text-xs text-tinta-tenue">Arrastre una plantilla a una carpeta para moverla.</p>}
          </div>
        </div>
      )}

      {modal?.tipo === "nueva" && (
        <DialogoCarpeta
          titulo="Nueva carpeta"
          carpetas={carpetas}
          dentroInicial={modal.dentro}
          alCerrar={() => setModal(null)}
          alGuardar={async (ruta) => {
            await api.crearCarpeta(ruta);
            setModal(null);
            setAviso({ tipo: "exito", texto: `Se creó la carpeta ${ruta.replaceAll("/", " › ")}.` });
            consulta.recargar();
          }}
        />
      )}
      {modal?.tipo === "renombrar" && (
        <DialogoCarpeta
          titulo="Renombrar carpeta"
          carpetas={carpetas}
          nombreInicial={nombreDe(modal.ruta)}
          dentroInicial={padre(modal.ruta)}
          fijo
          alCerrar={() => setModal(null)}
          alGuardar={async (ruta) => {
            await api.renombrarCarpeta(modal.ruta, ruta);
            setModal(null);
            setActual(ruta);
            setAviso({ tipo: "exito", texto: "Se renombró la carpeta y sus plantillas." });
            consulta.recargar();
          }}
        />
      )}
      {modal?.tipo === "mover" && (
        <DialogoMover
          plantilla={modal.plantilla}
          carpetas={carpetas}
          alCerrar={() => setModal(null)}
          alMover={(carpeta) => {
            const p = modal.plantilla;
            setModal(null);
            void mover(p, carpeta);
          }}
        />
      )}
    </div>
  );
}

function FilaArbol({
  nivel = 0,
  activa,
  soltando,
  expandida,
  alExpandir,
  alAbrir,
  icono,
  nombre,
  cuenta,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  nivel?: number;
  activa: boolean;
  soltando: boolean;
  expandida?: boolean;
  alExpandir?: () => void;
  alAbrir: () => void;
  icono: ReactNode;
  nombre: string;
  cuenta: number;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ paddingLeft: nivel * 14 }}
      className={cn(
        "flex items-center gap-0.5 rounded-lg",
        activa && "bg-hundido shadow-[inset_2px_0_0_var(--color-tec-azul)]",
        soltando && "bg-sello-claro outline-1 outline-dashed outline-sello",
      )}
    >
      {expandida !== undefined ? (
        <button type="button" aria-expanded={expandida} onClick={alExpandir} className="grid h-[30px] w-[22px] shrink-0 place-items-center text-tinta-tenue">
          <ChevronRight aria-hidden className={cn("size-3.5 transition-transform", expandida && "rotate-90")} />
          <span className="sr-only">{expandida ? "Contraer" : "Expandir"}</span>
        </button>
      ) : (
        <span className="w-[22px] shrink-0" />
      )}
      <button
        type="button"
        onClick={alAbrir}
        aria-current={activa ? "true" : undefined}
        className={cn("flex min-w-0 flex-1 items-center gap-2 px-1.5 py-[7px] text-left text-sm", activa ? "font-medium text-tec-azul" : "text-tinta")}
      >
        {icono}
        <span className="min-w-0 flex-1 truncate">{nombre}</span>
        <span className="cifras text-xs text-tinta-tenue">{cuenta}</span>
      </button>
    </div>
  );
}

function DialogoCarpeta({
  titulo,
  carpetas,
  nombreInicial = "",
  dentroInicial,
  fijo,
  alCerrar,
  alGuardar,
}: {
  titulo: string;
  carpetas: string[];
  nombreInicial?: string;
  dentroInicial: string;
  /** Al renombrar no se cambia la carpeta padre. */
  fijo?: boolean;
  alCerrar: () => void;
  alGuardar: (ruta: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [dentro, setDentro] = useState(dentroInicial);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const limpio = nombre.trim().replaceAll("/", "-");
    if (!limpio) {
      setError("Escriba un nombre.");
      return;
    }
    const ruta = dentro ? `${dentro}/${limpio}` : limpio;
    if (ruta !== (fijo ? `${dentroInicial ? `${dentroInicial}/` : ""}${nombreInicial}` : null) && carpetas.includes(ruta)) {
      setError("Ya existe una carpeta con ese nombre aquí.");
      return;
    }
    setGuardando(true);
    try {
      await alGuardar(ruta);
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Dialogo
      abierto
      alCerrar={alCerrar}
      titulo={titulo}
      acciones={
        <>
          <Boton variante="fantasma" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-carpeta" cargando={guardando}>
            Guardar
          </Boton>
        </>
      }
    >
      <form id="form-carpeta" noValidate onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4">
        <Campo etiqueta="Nombre" error={error}>
          {(p) => <Entrada {...p} value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)} />}
        </Campo>
        {!fijo && (
          <Campo etiqueta="Dentro de">
            {(p) => (
              <Selector {...p} value={dentro} onChange={(e) => setDentro(e.target.value)}>
                <option value="">Plantillas (raíz)</option>
                {carpetas.map((c) => (
                  <option key={c} value={c}>
                    {c.replaceAll("/", " › ")}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
        )}
      </form>
    </Dialogo>
  );
}

function DialogoMover({
  plantilla,
  carpetas,
  alCerrar,
  alMover,
}: {
  plantilla: Plantilla;
  carpetas: string[];
  alCerrar: () => void;
  alMover: (carpeta: string | null) => void;
}) {
  const [destino, setDestino] = useState(plantilla.carpeta ?? "");
  return (
    <Dialogo
      abierto
      alCerrar={alCerrar}
      titulo="Mover plantilla"
      descripcion={plantilla.nombre}
      acciones={
        <>
          <Boton variante="fantasma" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={() => alMover(destino || null)}>Mover</Boton>
        </>
      }
    >
      <Campo etiqueta="Carpeta de destino">
        {(p) => (
          <Selector {...p} value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">Sin carpeta</option>
            {carpetas.map((c) => (
              <option key={c} value={c}>
                {c.replaceAll("/", " › ")}
              </option>
            ))}
          </Selector>
        )}
      </Campo>
    </Dialogo>
  );
}
