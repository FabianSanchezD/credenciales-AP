"use client";

import type { Emision, TitularInscrito } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { abreviar, AreaTexto, Aviso, Boton, Campo, Cargando, Dialogo, cn, formatearFecha } from "@repo/ui";
import { ArrowDownUp, ChevronRight, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { env } from "../../lib/env";
import { mensajeError } from "../../lib/errores";
import { useConsulta } from "../../lib/use-consulta";
import { validarDid } from "../../lib/validacion";
import { useEmisor } from "../acceso";
import { ErrorCarga } from "../comun";

/** Resumen de cada titular a partir de sus emisiones. */
export interface FilaTitular {
  titular: TitularInscrito;
  emitidas: Emision[];
  revocadas: number;
  ultima: Emision | null;
}

export function resumirTitulares(titulares: TitularInscrito[], emisiones: Emision[]): FilaTitular[] {
  return titulares.map((titular) => {
    const emitidas = emisiones
      .filter((e) => e.titularDid === titular.did && (e.estado === "emitida" || e.estado === "revocada"))
      .sort((a, b) => (b.emitidaEn ?? "").localeCompare(a.emitidaEn ?? ""));
    return { titular, emitidas, revocadas: emitidas.filter((e) => e.estado === "revocada").length, ultima: emitidas[0] ?? null };
  });
}

type Orden = { campo: "did" | "creds" | "fecha"; asc: boolean };

const CLASE_FILTRO = "h-[26px] w-full rounded border border-linea px-1.5 text-xs font-normal text-tinta focus:outline-2 focus:outline-tec-azul";

export function VistaTitulares() {
  const { api } = useSesion();
  const emisor = useEmisor();
  const router = useRouter();
  const consulta = useConsulta(
    () => Promise.all([api.listarTitulares(emisor.id), api.listarEmisiones()]),
    `titulares:${emisor.id}`,
  );
  const [titulares = [], emisiones = []] = consulta.datos ?? [];
  const filas = useMemo(() => resumirTitulares(titulares, emisiones), [titulares, emisiones]);

  const [fDid, setFDid] = useState("");
  const [fCreds, setFCreds] = useState("");
  const [fPlantilla, setFPlantilla] = useState("");
  const [fFecha, setFFecha] = useState("");
  const [orden, setOrden] = useState<Orden>({ campo: "fecha", asc: false });
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [inscribiendo, setInscribiendo] = useState(false);
  const [ahora] = useState(() => Date.now());
  const [aviso, setAviso] = useState<string | null>(null);

  const plantillasUsadas = [...new Map(emisiones.map((e) => [e.plantillaId, e.plantillaNombre])).entries()];

  const visibles = filas
    .filter((f) => f.titular.did.toLowerCase().includes(fDid.trim().toLowerCase()))
    .filter((f) => {
      const n = f.emitidas.length;
      if (fCreds === "0") return n === 0;
      if (fCreds === "1") return n === 1;
      if (fCreds === "2") return n === 2;
      if (fCreds === "3") return n >= 3;
      if (fCreds === "rev") return f.revocadas > 0;
      return true;
    })
    .filter((f) => !fPlantilla || f.emitidas.some((e) => e.plantillaId === fPlantilla))
    .filter((f) => {
      if (!fFecha) return true;
      const ref = f.ultima?.emitidaEn ?? f.titular.registradoEn;
      return ahora - Date.parse(ref) <= Number(fFecha) * 86_400_000;
    })
    .sort((a, b) => {
      const signo = orden.asc ? 1 : -1;
      if (orden.campo === "did") return signo * a.titular.did.localeCompare(b.titular.did);
      if (orden.campo === "creds") return signo * (a.emitidas.length - b.emitidas.length);
      const fa = a.ultima?.emitidaEn ?? a.titular.registradoEn;
      const fb = b.ultima?.emitidaEn ?? b.titular.registradoEn;
      return signo * fa.localeCompare(fb);
    });

  const ordenar = (campo: Orden["campo"]) => setOrden((o) => ({ campo, asc: o.campo === campo ? !o.asc : campo === "did" }));
  const todosMarcados = visibles.length > 0 && visibles.every((f) => marcados.has(f.titular.did));


  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-tec-azul">Titulares</h1>
          <p className="mt-1.5 max-w-[62ch] text-tinta-suave">
            Personas de su institución que pueden recibir credenciales. Cada una se identifica con el DID de su Digital
            Wallet: no guardamos nombres, cédulas ni correos.
          </p>
        </div>
        <Boton icono={<UserPlus aria-hidden className="size-4" />} onClick={() => setInscribiendo(true)}>
          Inscribir titulares
        </Boton>
      </div>

      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
      {consulta.error && <ErrorCarga mensaje={consulta.error} alReintentar={consulta.recargar} />}
      {consulta.cargando && !consulta.datos && <Cargando texto="Cargando titulares" />}

      {consulta.datos && filas.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-linea px-6 py-12 text-center">
          <span className="grid size-14 place-items-center rounded-[14px] border border-linea bg-hundido text-tec-azul">
            <Users aria-hidden className="size-6" />
          </span>
          <h2 className="text-lg font-semibold">Todavía no hay titulares inscritos</h2>
          <p className="max-w-md text-tinta-suave">Inscriba a las personas con el DID de su Digital Wallet para poder emitirles credenciales.</p>
          <Boton onClick={() => setInscribiendo(true)}>Inscribir titulares</Boton>
        </div>
      )}

      {marcados.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[9px] border border-tec-azul bg-superficie px-3.5 py-2.5 text-sm">
          <b className="font-medium">{marcados.size === 1 ? "1 seleccionado" : `${marcados.size} seleccionados`}</b>
          <Boton tamano="sm" onClick={() => router.push(`/emitir?titulares=${encodeURIComponent([...marcados].join(","))}`)}>
            Emitir credencial a estas personas
          </Boton>
          <Boton tamano="sm" variante="fantasma" onClick={() => setMarcados(new Set())}>
            Quitar selección
          </Boton>
        </div>
      )}

      {filas.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-[10px] border border-linea bg-superficie">
            <table className="cifras w-full min-w-[860px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] font-medium text-tinta-tenue">
                  <th className="sticky top-0 h-8 w-9 border-b border-linea bg-hundido text-center">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos"
                      checked={todosMarcados}
                      onChange={() => setMarcados(todosMarcados ? new Set() : new Set(visibles.map((f) => f.titular.did)))}
                      className="size-[15px] accent-[var(--color-tec-azul)]"
                    />
                  </th>
                  <th className="h-8 w-10 border-b border-linea bg-hundido px-2.5 text-right">#</th>
                  <th className="h-8 border-b border-linea bg-hundido px-2.5"><Encabezado campo="did" orden={orden} alOrdenar={ordenar}>Titular (DID)</Encabezado></th>
                  <th className="h-8 border-b border-linea bg-hundido px-2.5"><Encabezado campo="creds" orden={orden} alOrdenar={ordenar}>Cred.</Encabezado></th>
                  <th className="h-8 border-b border-linea bg-hundido px-2.5">Última credencial</th>
                  <th className="h-8 border-b border-linea bg-hundido px-2.5"><Encabezado campo="fecha" orden={orden} alOrdenar={ordenar}>Fecha</Encabezado></th>
                  <th className="h-8 w-10 border-b border-linea bg-hundido" />
                </tr>
                <tr>
                  <th className="border-b border-linea" />
                  <th className="border-b border-linea" />
                  <th className="border-b border-linea px-1 py-1">
                    <input aria-label="Filtrar por DID" placeholder="Buscar DID" value={fDid} onChange={(e) => setFDid(e.target.value)} className={CLASE_FILTRO} />
                  </th>
                  <th className="border-b border-linea px-1 py-1">
                    <select aria-label="Filtrar por credenciales" value={fCreds} onChange={(e) => setFCreds(e.target.value)} className={CLASE_FILTRO}>
                      <option value="">Todas</option>
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3 o más</option>
                      <option value="rev">Con revocadas</option>
                    </select>
                  </th>
                  <th className="border-b border-linea px-1 py-1">
                    <select aria-label="Filtrar por plantilla recibida" value={fPlantilla} onChange={(e) => setFPlantilla(e.target.value)} className={CLASE_FILTRO}>
                      <option value="">Cualquier plantilla</option>
                      {plantillasUsadas.map(([id, nombre]) => (
                        <option key={id} value={id}>
                          {nombre}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th className="border-b border-linea px-1 py-1">
                    <select aria-label="Filtrar por fecha" value={fFecha} onChange={(e) => setFFecha(e.target.value)} className={CLASE_FILTRO}>
                      <option value="">Cualquier fecha</option>
                      <option value="30">Últimos 30 días</option>
                      <option value="90">Últimos 90 días</option>
                      <option value="365">Último año</option>
                    </select>
                  </th>
                  <th className="border-b border-linea" />
                </tr>
              </thead>
              <tbody>
                {visibles.map((f, i) => (
                  <tr key={f.titular.id} className={cn("even:bg-[#fbfbfc] hover:bg-marino-claro", marcados.has(f.titular.did) && "bg-marino-claro")}>
                    <td className="h-[34px] border-b border-linea text-center">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${abreviar(f.titular.did, 24, 6)}`}
                        checked={marcados.has(f.titular.did)}
                        onChange={() => {
                          const nuevos = new Set(marcados);
                          if (nuevos.has(f.titular.did)) nuevos.delete(f.titular.did);
                          else nuevos.add(f.titular.did);
                          setMarcados(nuevos);
                        }}
                        className="size-[15px] accent-[var(--color-tec-azul)]"
                      />
                    </td>
                    <td className="border-b border-linea px-2.5 text-right text-xs text-tinta-tenue">{i + 1}</td>
                    <td className="max-w-[260px] border-b border-linea px-2.5">
                      <Link href={`/titulares/${f.titular.id}`} title={f.titular.did} className="font-mono text-[12.5px] font-medium text-tec-azul hover:underline">
                        {abreviar(f.titular.did, 24, 6)}
                      </Link>
                    </td>
                    <td className="border-b border-linea px-2.5">
                      {f.emitidas.length}
                      {f.revocadas > 0 && <span className="ml-1 text-[11.5px] text-lacre">({f.revocadas} rev.)</span>}
                    </td>
                    <td className="max-w-[240px] truncate border-b border-linea px-2.5">{f.ultima?.plantillaNombre ?? <span className="text-tinta-tenue">Ninguna</span>}</td>
                    <td className="border-b border-linea px-2.5">{formatearFecha(f.ultima?.emitidaEn ?? f.titular.registradoEn)}</td>
                    <td className="border-b border-linea text-center">
                      <Link href={`/titulares/${f.titular.id}`} className="inline-grid rounded p-1 text-tinta-tenue hover:bg-linea hover:text-tec-azul">
                        <ChevronRight aria-hidden className="size-4" />
                        <span className="sr-only">Ver titular</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibles.length === 0 && <p className="p-4 text-sm text-tinta-suave">No hay titulares que coincidan con los filtros.</p>}
          </div>
          <p className="text-[13px] text-tinta-suave">
            {visibles.length} de {filas.length} titulares
          </p>
        </>
      )}

      {inscribiendo && (
        <DialogoInscribir
          alCerrar={() => setInscribiendo(false)}
          alInscribir={(n) => {
            setInscribiendo(false);
            setAviso(n === 1 ? "Se inscribió 1 titular." : `Se inscribieron ${n} titulares.`);
            consulta.recargar();
          }}
        />
      )}
    </div>
  );
}

function Encabezado({
  campo,
  orden,
  alOrdenar,
  children,
}: {
  campo: Orden["campo"];
  orden: Orden;
  alOrdenar: (campo: Orden["campo"]) => void;
  children: string;
}) {
  return (
    <button type="button" onClick={() => alOrdenar(campo)} className="inline-flex items-center gap-1 hover:text-tec-azul">
      {children}
      <ArrowDownUp aria-hidden className={cn("size-3", orden.campo === campo ? "text-tec-azul" : "opacity-40")} />
      <span className="sr-only">{orden.campo === campo ? (orden.asc ? " (ascendente)" : " (descendente)") : " (ordenar)"}</span>
    </button>
  );
}

/** Inscribe uno o varios DIDs (uno por línea o separados por coma). */
function DialogoInscribir({ alCerrar, alInscribir }: { alCerrar: () => void; alInscribir: (n: number) => void }) {
  const { api } = useSesion();
  const emisor = useEmisor();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const dids = [...new Set(texto.split(/[\s,;]+/).map((d) => d.trim()).filter(Boolean))];
    if (dids.length === 0) {
      setError("Pegue al menos un DID.");
      return;
    }
    const malos = dids.map((d) => [d, validarDid(d)] as const).filter(([, p]) => p);
    if (malos.length) {
      setError(`${malos.length === 1 ? "Este DID no es válido" : `${malos.length} DIDs no son válidos`}: ${abreviar(malos[0]![0], 24, 6)}. ${malos[0]![1]}`);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      for (const did of dids) await api.inscribirTitular(emisor.id, did);
      alInscribir(dids.length);
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  }

  return (
    <Dialogo
      abierto
      alCerrar={alCerrar}
      titulo="Inscribir titulares"
      descripcion="Pida a cada persona el DID de su Digital Wallet. Puede pegar varios, uno por línea."
      acciones={
        <>
          <Boton variante="fantasma" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-inscribir" cargando={enviando}>
            Inscribir
          </Boton>
        </>
      }
    >
      <form id="form-inscribir" noValidate onSubmit={(e) => void enviar(e)} className="flex flex-col gap-3">
        <Campo etiqueta="DIDs" error={error} ayuda={`Por ejemplo, did:stellar:${env.stellarNetwork}:G…`}>
          {(p) => (
            <AreaTexto
              {...p}
              rows={5}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              className="font-mono text-[12.5px]"
            />
          )}
        </Campo>
      </form>
    </Dialogo>
  );
}
