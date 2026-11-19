"use client";

import type { Emision, Plantilla } from "@repo/cliente";
import { ETIQUETAS_NIVEL } from "@repo/credenciales";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Cargando, cn, formatearFecha } from "@repo/ui";
import { FileText, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { esBorrador } from "../../lib/emisiones";
import { useConsulta } from "../../lib/use-consulta";
import { useEmisor } from "../acceso";
import { EnlaceTexto, ErrorCarga } from "../comun";

const DIA = 86_400_000;
const RANGOS = [
  { id: "7", etiqueta: "7 días" },
  { id: "30", etiqueta: "30 días" },
  { id: "90", etiqueta: "90 días" },
  { id: "365", etiqueta: "12 meses" },
  { id: "personalizado", etiqueta: "Personalizado" },
] as const;
type Rango = (typeof RANGOS)[number]["id"];

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const inicioDelDia = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Fecha de emisión (las revocadas también se emitieron). */
function fechaEmision(e: Emision): number | null {
  return e.emitidaEn && (e.estado === "emitida" || e.estado === "revocada") ? Date.parse(e.emitidaEn) : null;
}

function Accion({
  href,
  icono,
  titulo,
  children,
  principal,
}: {
  href: string;
  icono: ReactNode;
  titulo: string;
  children: ReactNode;
  principal?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-2 rounded-[10px] border bg-superficie p-[18px] text-tinta hover:border-tec-azul",
        principal ? "border-tec-azul shadow-[inset_0_0_0_1px_var(--color-tec-azul)]" : "border-linea",
      )}
    >
      <span aria-hidden className="grid size-9 place-items-center rounded-lg border border-linea text-tec-azul">
        {icono}
      </span>
      <b className="text-[15px] font-medium">{titulo}</b>
      <span className="text-[13px] text-tinta-suave">{children}</span>
    </Link>
  );
}

/** Barras por día (≤31 días), semana (≤120) o mes. */
function Grafico({ fechas, desde, hasta }: { fechas: number[]; desde: number; hasta: number }) {
  const dias = Math.round((hasta - desde) / DIA) + 1;
  const paso = dias <= 31 ? "dia" : dias <= 120 ? "semana" : "mes";
  const grupos: Array<{ inicio: number; n: number }> = [];
  if (paso === "mes") {
    const d = new Date(desde);
    d.setDate(1);
    while (d.getTime() <= hasta) {
      grupos.push({ inicio: d.getTime(), n: 0 });
      d.setMonth(d.getMonth() + 1);
    }
  } else {
    const ancho = paso === "dia" ? DIA : 7 * DIA;
    for (let t = desde; t <= hasta; t += ancho) grupos.push({ inicio: t, n: 0 });
  }
  for (const f of fechas) {
    for (let i = grupos.length - 1; i >= 0; i--) {
      if (f >= grupos[i]!.inicio) {
        grupos[i]!.n++;
        break;
      }
    }
  }
  const max = Math.max(1, ...grupos.map((g) => g.n));
  const W = 560;
  const H = 180;
  const base = H - 22;
  const ancho = W / grupos.length;
  const cada = Math.ceil(grupos.length / 8);
  const etiqueta = (t: number) =>
    new Date(t).toLocaleDateString("es-CR", paso === "mes" ? { month: "short" } : { day: "numeric", month: "short" });
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(max * p)).filter((v, i, a) => a.indexOf(v) === i);
  return (
    <figure className="m-0 flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Credenciales emitidas en el periodo">
        {marcas.map((v) => {
          const y = base - (v / max) * (base - 8);
          return (
            <g key={v}>
              <line x1="18" x2={W} y1={y} y2={y} stroke="var(--color-linea)" strokeWidth="1" />
              <text x="0" y={y + 3} fontSize="9" fill="var(--color-tinta-tenue)">
                {v}
              </text>
            </g>
          );
        })}
        {grupos.map((g, i) => {
          const h = (g.n / max) * (base - 8);
          const x = 22 + i * ((W - 22) / grupos.length);
          const w = Math.max(2, ((W - 22) / grupos.length) * 0.7);
          return (
            <g key={g.inicio}>
              {g.n > 0 && (
                <rect x={x} y={base - h} width={w} height={h} fill="var(--color-tec-azul)">
                  <title>{`${etiqueta(g.inicio)}: ${g.n}`}</title>
                </rect>
              )}
              {i % cada === 0 && (
                <text x={x + w / 2} y={H - 6} fontSize="9" textAnchor="middle" fill="var(--color-tinta-tenue)">
                  {etiqueta(g.inicio)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="text-xs text-tinta-tenue">
        {paso === "dia" ? "Por día" : paso === "semana" ? "Por semana" : "Por mes"}
        <span className="sr-only">{` · ${ancho > 0 ? grupos.length : 0} grupos`}</span>
      </figcaption>
    </figure>
  );
}

function Actividad({ emisiones, plantillas }: { emisiones: Emision[]; plantillas: Plantilla[] }) {
  const [rango, setRango] = useState<Rango>("30");
  const [hoy] = useState(() => inicioDelDia(Date.now()));
  const [desdeTxt, setDesdeTxt] = useState(iso(hoy - 29 * DIA));
  const [hastaTxt, setHastaTxt] = useState(iso(hoy));

  const desde =
    rango === "personalizado" ? inicioDelDia(Date.parse(`${desdeTxt}T00:00`)) : hoy - (Number(rango) - 1) * DIA;
  const hasta = (rango === "personalizado" ? inicioDelDia(Date.parse(`${hastaTxt}T00:00`)) : hoy) + DIA - 1;
  const valido = Number.isFinite(desde) && Number.isFinite(hasta) && desde <= hasta;

  const conFecha = emisiones.map((e) => ({ e, f: fechaEmision(e) })).filter((x): x is { e: Emision; f: number } => x.f !== null);
  const enRango = valido ? conFecha.filter((x) => x.f >= desde && x.f <= hasta) : [];
  const largo = hasta - desde + 1;
  const previo = valido ? conFecha.filter((x) => x.f >= desde - largo && x.f < desde).length : 0;
  const delta = previo ? Math.round(((enRango.length - previo) / previo) * 100) : null;

  const porPlantilla = new Map<string, number>();
  for (const { e } of enRango) porPlantilla.set(e.plantillaId, (porPlantilla.get(e.plantillaId) ?? 0) + 1);
  const top = [...porPlantilla.entries()]
    .map(([id, n]) => ({ id, n, plantilla: plantillas.find((p) => p.id === id), nombre: enRango.find((x) => x.e.plantillaId === id)!.e.plantillaNombre }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const maxTop = Math.max(1, ...top.map((t) => t.n));

  return (
    <section aria-labelledby="titulo-actividad" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 id="titulo-actividad" className="text-lg font-bold text-tinta">
          Actividad
        </h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <div role="group" aria-label="Rango de fechas" className="flex flex-wrap gap-1.5">
            {RANGOS.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={rango === r.id}
                onClick={() => setRango(r.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[13px]",
                  rango === r.id ? "border-tec-azul bg-tec-azul text-white" : "border-linea bg-superficie text-tinta hover:border-tec-azul",
                )}
              >
                {r.etiqueta}
              </button>
            ))}
          </div>
          {rango === "personalizado" && (
            <div className="flex flex-wrap items-center gap-2 text-[13.5px] text-tinta-suave">
              <label htmlFor="r-desde">Desde</label>
              <input id="r-desde" type="date" value={desdeTxt} max={hastaTxt} onChange={(e) => setDesdeTxt(e.target.value)} className="h-9 rounded-control border border-linea px-2 text-tinta" />
              <label htmlFor="r-hasta">hasta</label>
              <input id="r-hasta" type="date" value={hastaTxt} min={desdeTxt} onChange={(e) => setHastaTxt(e.target.value)} className="h-9 rounded-control border border-linea px-2 text-tinta" />
            </div>
          )}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3.5 rounded-[10px] border border-linea bg-superficie p-5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <b className="cifras text-[38px] font-bold leading-none text-tec-azul">{enRango.length.toLocaleString("es-CR")}</b>
            <span className="text-sm text-tinta-suave">
              credenciales emitidas · {valido ? `${formatearFecha(new Date(desde).toISOString())} – ${formatearFecha(new Date(hasta).toISOString())}` : "rango no válido"}
            </span>
          </div>
          {delta !== null && (
            <span className={cn("text-[13px]", delta >= 0 ? "text-sello" : "text-lacre")}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% respecto al periodo anterior ({previo})
            </span>
          )}
          {valido && <Grafico fechas={enRango.map((x) => x.f)} desde={desde} hasta={hasta} />}
        </div>

        <div className="flex min-w-0 flex-col gap-3.5 rounded-[10px] border border-linea bg-superficie p-5">
          <h3 className="text-base font-bold text-tinta">Plantillas más usadas</h3>
          {top.length > 0 ? (
            <ol className="flex flex-col gap-3.5">
              {top.map((t) => (
                <li key={t.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-2.5 text-sm">
                    <span className="truncate">{t.plantilla?.nombre ?? t.nombre}</span>
                    <b className="cifras font-medium">{t.n}</b>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-hundido">
                    <i className="block h-full rounded-full bg-tec-azul" style={{ width: `${((t.n / maxTop) * 100).toFixed(1)}%` }} />
                  </div>
                  <span className="text-xs text-tinta-suave">
                    {t.plantilla ? `${ETIQUETAS_NIVEL[t.plantilla.contexto.nivel]} · ${t.plantilla.contexto.horas} h · ` : ""}
                    {Math.round((t.n / enRango.length) * 100)}% del periodo
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-tinta-suave">No hubo emisiones en este rango.</p>
          )}
          <EnlaceTexto href="/plantillas">Ver todas las plantillas</EnlaceTexto>
        </div>
      </div>
    </section>
  );
}

export function VistaInicio() {
  const { api } = useSesion();
  const emisor = useEmisor();
  const datos = useConsulta(() => Promise.all([api.listarEmisiones(), api.listarPlantillas()]), `inicio:${emisor.id}`);
  const [emisiones = [], plantillas = []] = datos.datos ?? [];
  const pendientes = emisiones.filter((e) => esBorrador(e.estado)).length;

  return (
    <div className="flex flex-col gap-7">
      <h1 className="text-[1.75rem] font-bold leading-tight text-tec-azul">{emisor.nombre}</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <Accion href="/plantillas/nueva" principal icono={<FileText className="size-[18px]" />} titulo="1. Crear una plantilla">
          Defina qué certifica: título, grado, resultados y vigencia.
        </Accion>
        <Accion href="/titulares" icono={<UserPlus className="size-[18px]" />} titulo="2. Inscribir titulares">
          Agregue a las personas que recibirán la credencial.
        </Accion>
        <Accion href="/emitir" icono={<ShieldCheck className="size-[18px]" />} titulo="3. Emitir credenciales">
          Firme y entregue la credencial al titular.
        </Accion>
      </div>
      {pendientes > 0 && (
        <Aviso
          tipo="advertencia"
          titulo={pendientes === 1 ? "Tiene 1 emisión sin terminar" : `Tiene ${pendientes} emisiones sin terminar`}
          accion={<EnlaceTexto href="/emisiones">Revisar emisiones</EnlaceTexto>}
        >
          No llegaron a la wallet del titular. Abra cada una para retomarla.
        </Aviso>
      )}
      {datos.error && <ErrorCarga mensaje={datos.error} alReintentar={datos.recargar} />}
      {datos.cargando && !datos.datos && <Cargando texto="Cargando la actividad" />}
      {datos.datos && <Actividad emisiones={emisiones} plantillas={plantillas} />}
    </div>
  );
}
