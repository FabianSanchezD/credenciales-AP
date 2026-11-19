"use client";

import type { Plantilla } from "@repo/cliente";
import {
  ETIQUETAS_MODALIDAD,
  ETIQUETAS_NIVEL,
  ETIQUETAS_TIPO_APRENDIZAJE,
  MODALIDADES,
  NIVELES,
  TIPOS_APRENDIZAJE,
  contenidoPlantillaSchema,
  type ContenidoPlantilla,
  type Modalidad,
  type Nivel,
  type TipoAprendizaje,
} from "@repo/credenciales";
import { AreaTexto, Aviso, Boton, Campo, Entrada, Panel, Selector, cn } from "@repo/ui";
import { X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { env } from "../lib/env";
import { mensajeError } from "../lib/errores";
import { ListaEditable, nuevoElemento, type Elemento } from "./lista-editable";
import { VistaPreviaCredencial } from "./vista-previa-credencial";

/** Carpeta y etiquetas: organizan el portal, no forman parte de la credencial. */
export interface Organizacion {
  carpeta: string | null;
  etiquetas: string[];
}

type Errores = Partial<
  Record<"nombre" | "descripcion" | "resultados" | "temas" | "horas" | "nivel" | "modalidad" | "tipo" | "vigencia", string>
>;

interface Borrador {
  nombre: string;
  descripcion: string;
  resultados: Elemento[];
  temas: Elemento[];
  horas: string;
  nivel: Nivel | "";
  modalidad: Modalidad | "";
  tipo: TipoAprendizaje | "";
  vence: boolean;
  vigencia: string;
}

/** Contenido ficticio para probar en testnet. */
function ejemplo(): Borrador {
  return {
    nombre: "Fundamentos de Blockchain",
    descripcion:
      "Curso introductorio sobre redes blockchain, firmas digitales y credenciales verificables, con prácticas en la red de pruebas de Stellar.",
    resultados: [
      nuevoElemento("Explica cómo funcionan el consenso y la firma digital"),
      nuevoElemento("Emite y verifica una credencial verificable en Stellar"),
    ],
    temas: [nuevoElemento("Criptografía"), nuevoElemento("Stellar"), nuevoElemento("Identidad descentralizada")],
    horas: "40",
    nivel: "intermedio",
    modalidad: "virtual",
    tipo: "no_formal",
    vence: true,
    vigencia: "24",
  };
}

function inicial(plantilla?: Plantilla): Borrador {
  if (!plantilla) {
    return {
      nombre: "",
      descripcion: "",
      resultados: [nuevoElemento()],
      temas: [],
      horas: "",
      nivel: "",
      modalidad: "",
      tipo: "",
      vence: false,
      vigencia: "",
    };
  }
  return {
    nombre: plantilla.nombre,
    descripcion: plantilla.descripcion,
    resultados: plantilla.resultadosAprendizaje.map((texto) => nuevoElemento(texto)),
    temas: plantilla.temasEvaluados.map((texto) => nuevoElemento(texto)),
    horas: String(plantilla.contexto.horas),
    nivel: plantilla.contexto.nivel,
    modalidad: plantilla.contexto.modalidad,
    tipo: plantilla.contexto.tipoAprendizaje,
    vence: plantilla.vigenciaMeses !== null,
    vigencia: plantilla.vigenciaMeses === null ? "" : String(plantilla.vigenciaMeses),
  };
}

function limpiar(elementos: Elemento[]): string[] {
  return elementos.map((e) => e.texto.trim()).filter(Boolean);
}

/** Revisa el borrador con mensajes claros y luego con el esquema compartido. */
function validar(b: Borrador): { contenido: ContenidoPlantilla | null; errores: Errores } {
  const errores: Errores = {};
  const nombre = b.nombre.trim();
  const descripcion = b.descripcion.trim();
  const resultados = limpiar(b.resultados);
  const temas = limpiar(b.temas);
  const horas = Number(b.horas.replace(",", "."));
  const vigencia = Number(b.vigencia);

  if (!nombre) errores.nombre = "Escriba el nombre del curso o logro.";
  else if (nombre.length > 200) errores.nombre = "El nombre puede tener hasta 200 caracteres.";
  if (!descripcion) errores.descripcion = "Describa en pocas líneas qué acredita esta credencial.";
  else if (descripcion.length > 2000) errores.descripcion = "La descripción puede tener hasta 2000 caracteres.";
  if (resultados.length === 0) {
    errores.resultados = "Agregue al menos un resultado de aprendizaje.";
  } else if (resultados.length > 30) {
    errores.resultados = "Puede registrar hasta 30 resultados de aprendizaje.";
  }
  if (temas.length > 50) errores.temas = "Puede registrar hasta 50 temas evaluados.";
  if (!b.horas.trim()) errores.horas = "Indique la duración en horas.";
  else if (!Number.isFinite(horas) || horas <= 0 || horas > 10000) {
    errores.horas = "Escriba un número de horas mayor que 0 y hasta 10 000.";
  }
  if (!b.nivel) errores.nivel = "Elija el nivel.";
  if (!b.modalidad) errores.modalidad = "Elija la modalidad.";
  if (!b.tipo) errores.tipo = "Indique si el aprendizaje es formal o no formal.";
  if (b.vence && (!Number.isInteger(vigencia) || vigencia <= 0 || vigencia > 600)) {
    errores.vigencia = "Escriba un número entero de meses, entre 1 y 600.";
  }
  if (Object.keys(errores).length > 0) return { contenido: null, errores };

  const resultado = contenidoPlantillaSchema.safeParse({
    nombre,
    descripcion,
    resultadosAprendizaje: resultados,
    temasEvaluados: temas,
    contexto: { horas, nivel: b.nivel, modalidad: b.modalidad, tipoAprendizaje: b.tipo },
    vigenciaMeses: b.vence ? vigencia : null,
  });
  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      const [raiz, sub] = issue.path;
      if (raiz === "resultadosAprendizaje") errores.resultados = "Cada resultado puede tener hasta 200 caracteres.";
      else if (raiz === "temasEvaluados") errores.temas = "Cada tema puede tener hasta 200 caracteres.";
      else if (raiz === "contexto" && sub === "horas") errores.horas = "Revise la cantidad de horas.";
      else if (raiz === "vigenciaMeses") errores.vigencia = "Revise los meses de vigencia.";
      else errores.nombre ??= "Revise los datos de la plantilla.";
    }
    return { contenido: null, errores };
  }
  return { contenido: resultado.data, errores };
}

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion: ReactNode; children: ReactNode }) {
  return (
    <Panel className="grid gap-5 2xl:grid-cols-[minmax(0,14rem)_1fr] 2xl:gap-8">
      <div>
        <h2 className="text-lg font-semibold text-tinta">{titulo}</h2>
        <div className="mt-1.5 text-sm text-tinta-suave">{descripcion}</div>
      </div>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </Panel>
  );
}

/**
 * Formulario de plantilla (RF-05). El contenido académico es de la
 * institución: la plataforma solo valida que esté completo.
 */
export function FormularioPlantilla({
  plantilla,
  textoGuardar,
  alGuardar,
  alCancelar,
  carpetas = [],
  carpetaInicial = null,
  emisorNombre,
}: {
  plantilla?: Plantilla;
  textoGuardar: string;
  alGuardar: (contenido: ContenidoPlantilla, organizacion: Organizacion) => Promise<void>;
  alCancelar?: () => void;
  /** Carpetas existentes para elegir la ubicación. */
  carpetas?: string[];
  carpetaInicial?: string | null;
  emisorNombre: string;
}) {
  const [b, setB] = useState<Borrador>(() => inicial(plantilla));
  const [carpeta, setCarpeta] = useState<string | null>(plantilla?.carpeta ?? carpetaInicial);
  const [etiquetas, setEtiquetas] = useState<string[]>(plantilla?.etiquetas ?? []);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");

  function agregarEtiqueta() {
    const texto = nuevaEtiqueta.trim().replace(/^#/, "");
    if (texto && !etiquetas.includes(texto) && etiquetas.length < 20) setEtiquetas([...etiquetas, texto.slice(0, 40)]);
    setNuevaEtiqueta("");
  }
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cambiar<K extends keyof Borrador>(campo: K, valor: Borrador[K]) {
    setB((previo) => ({ ...previo, [campo]: valor }));
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const { contenido, errores: nuevos } = validar(b);
    setErrores(nuevos);
    if (!contenido) {
      setError("Revise los campos marcados antes de guardar.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await alGuardar(contenido, { carpeta, etiquetas });
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la plantilla. Intente de nuevo."));
    } finally {
      setGuardando(false);
    }
  }

  const opcionesCarpeta = [...new Set([...carpetas, ...(carpeta ? [carpeta] : [])])].sort((x, y) => x.localeCompare(y, "es"));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
    <form onSubmit={(e) => void enviar(e)} noValidate className="flex min-w-0 flex-col gap-5">
      {!plantilla && env.stellarNetwork === "testnet" && (
        <Aviso
          tipo="info"
          accion={
            <Boton type="button" tamano="sm" variante="secundario" onClick={() => setB(ejemplo())}>
              Usar datos de ejemplo
            </Boton>
          }
        >
          Está en testnet: puede rellenar la plantilla con un curso ficticio para probar.
        </Aviso>
      )}
      <Seccion
        titulo="Ubicación"
        descripcion="Carpeta y etiquetas solo organizan sus plantillas en el portal. No forman parte de la credencial ni cambian su versión."
      >
        <Campo etiqueta="Carpeta" opcional>
          {(props) => (
            <Selector {...props} value={carpeta ?? ""} onChange={(e) => setCarpeta(e.target.value || null)}>
              <option value="">Sin carpeta</option>
              {opcionesCarpeta.map((ruta) => (
                <option key={ruta} value={ruta}>
                  {ruta.replaceAll("/", " › ")}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <div className="flex flex-col gap-2">
          <label htmlFor="nueva-etiqueta" className="text-sm font-semibold text-tinta">
            Etiquetas <span className="font-normal text-tinta-tenue">(opcional)</span>
          </label>
          {etiquetas.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {etiquetas.map((t) => (
                <li key={t} className="inline-flex items-center gap-1 rounded-full border border-linea bg-hundido py-1 pl-3 pr-1.5 text-[13px]">
                  #{t}
                  <button
                    type="button"
                    onClick={() => setEtiquetas(etiquetas.filter((x) => x !== t))}
                    className="grid size-5 place-items-center rounded-full text-tinta-tenue hover:bg-linea hover:text-tinta"
                  >
                    <X aria-hidden className="size-3" />
                    <span className="sr-only">Quitar {t}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Entrada
              id="nueva-etiqueta"
              value={nuevaEtiqueta}
              placeholder="Por ejemplo, acreditada"
              onChange={(e) => setNuevaEtiqueta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarEtiqueta();
                }
              }}
            />
            <Boton type="button" variante="secundario" onClick={agregarEtiqueta}>
              Agregar
            </Boton>
          </div>
        </div>
      </Seccion>
      <Seccion
        titulo="El logro"
        descripcion="Es lo que verá cualquier persona que reciba la credencial: el nombre y una descripción breve."
      >
        <Campo etiqueta="Nombre del curso o logro" error={errores.nombre}>
          {(props) => (
            <Entrada
              {...props}
              value={b.nombre}
              maxLength={200}
              onChange={(e) => cambiar("nombre", e.target.value)}
              placeholder="Por ejemplo, Fundamentos de análisis de datos"
            />
          )}
        </Campo>
        <Campo etiqueta="Descripción" error={errores.descripcion}>
          {(props) => (
            <AreaTexto
              {...props}
              value={b.descripcion}
              maxLength={2000}
              onChange={(e) => cambiar("descripcion", e.target.value)}
            />
          )}
        </Campo>
      </Seccion>

      <Seccion
        titulo="Qué aprendió"
        descripcion={
          <>
            <p>
              Los resultados de aprendizaje son obligatorios. Una credencial con solo un nombre y una
              nota no le dice a un empleador qué sabe hacer la persona.
            </p>
            <p className="mt-2">Escriba cada resultado como algo que la persona puede hacer.</p>
          </>
        }
      >
        <ListaEditable
          etiqueta="Resultados de aprendizaje"
          etiquetaElemento={(i) => `Resultado de aprendizaje ${i + 1}`}
          ayuda="Al menos uno. Por ejemplo, Limpia y transforma datos con Python."
          error={errores.resultados}
          elementos={b.resultados}
          alCambiar={(valor) => cambiar("resultados", valor)}
          textoAgregar="Agregar resultado"
          minimo={1}
          maximo={30}
        />
        <ListaEditable
          etiqueta="Temas evaluados (opcional)"
          etiquetaElemento={(i) => `Tema evaluado ${i + 1}`}
          ayuda="Los contenidos sobre los que se evaluó a la persona."
          error={errores.temas}
          elementos={b.temas}
          alCambiar={(valor) => cambiar("temas", valor)}
          textoAgregar="Agregar tema"
          maximo={50}
        />
      </Seccion>

      <Seccion
        titulo="Contexto formativo"
        descripcion="Duración, nivel, modalidad y tipo de aprendizaje permiten comparar credenciales de distintas instituciones. También son obligatorios."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo etiqueta="Duración en horas" error={errores.horas}>
            {(props) => (
              <Entrada
                {...props}
                inputMode="decimal"
                value={b.horas}
                onChange={(e) => cambiar("horas", e.target.value)}
                className="cifras"
              />
            )}
          </Campo>
          <Campo etiqueta="Nivel" error={errores.nivel}>
            {(props) => (
              <Selector {...props} value={b.nivel} onChange={(e) => cambiar("nivel", e.target.value as Nivel)}>
                <option value="" disabled>
                  Elija un nivel
                </option>
                {NIVELES.map((valor) => (
                  <option key={valor} value={valor}>
                    {ETIQUETAS_NIVEL[valor]}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Modalidad" error={errores.modalidad}>
            {(props) => (
              <Selector
                {...props}
                value={b.modalidad}
                onChange={(e) => cambiar("modalidad", e.target.value as Modalidad)}
              >
                <option value="" disabled>
                  Elija una modalidad
                </option>
                {MODALIDADES.map((valor) => (
                  <option key={valor} value={valor}>
                    {ETIQUETAS_MODALIDAD[valor]}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-tinta">Tipo de aprendizaje</legend>
          <p className="text-sm text-tinta-tenue">
            Formal: forma parte de un programa reconocido. No formal: curso, taller o bootcamp fuera de
            un programa. El aprendizaje informal no se acredita.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TIPOS_APRENDIZAJE.map((valor) => (
              <Opcion
                key={valor}
                nombre="tipoAprendizaje"
                marcada={b.tipo === valor}
                alMarcar={() => cambiar("tipo", valor)}
              >
                {ETIQUETAS_TIPO_APRENDIZAJE[valor]}
              </Opcion>
            ))}
          </div>
          {errores.tipo && <p className="text-sm font-medium text-lacre">{errores.tipo}</p>}
        </fieldset>
      </Seccion>

      <Seccion
        titulo="Vigencia"
        descripcion="Algunas certificaciones deben renovarse. Si la credencial vence, la verificación lo indicará después de esa fecha."
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Vigencia de la credencial</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Opcion nombre="vigencia" marcada={!b.vence} alMarcar={() => cambiar("vence", false)}>
              No vence
            </Opcion>
            <Opcion nombre="vigencia" marcada={b.vence} alMarcar={() => cambiar("vence", true)}>
              Vence después de un plazo
            </Opcion>
          </div>
        </fieldset>
        {b.vence && (
          <Campo etiqueta="Meses de vigencia" error={errores.vigencia} ayuda="Se cuentan desde la fecha de emisión.">
            {(props) => (
              <Entrada
                {...props}
                inputMode="numeric"
                value={b.vigencia}
                onChange={(e) => cambiar("vigencia", e.target.value)}
                className="cifras sm:max-w-40"
              />
            )}
          </Campo>
        )}
      </Seccion>

      <p className="text-sm text-tinta-tenue">
        Este contenido es de su institución. La plataforma solo revisa que esté completo y nunca lo
        modifica.
      </p>
      {error && (
        <Aviso tipo="error" titulo="No se guardó la plantilla">
          {error}
        </Aviso>
      )}
      <div className="flex flex-wrap gap-2">
        <Boton type="submit" cargando={guardando}>
          {textoGuardar}
        </Boton>
        {alCancelar && (
          <Boton variante="secundario" onClick={alCancelar} disabled={guardando}>
            Cancelar
          </Boton>
        )}
      </div>
    </form>
      <VistaPrevia b={b} emisorNombre={emisorNombre} />
    </div>
  );
}

function VistaPrevia({ b, emisorNombre }: { b: Borrador; emisorNombre: string }) {
  return (
    <aside className="flex flex-col gap-2.5 lg:sticky lg:top-24">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-tinta-tenue">Vista previa</span>
      <VistaPreviaCredencial
        emisor={emisorNombre}
        nombre={b.nombre}
        descripcion={b.descripcion}
        resultados={limpiar(b.resultados)}
        temas={limpiar(b.temas)}
        horas={b.horas}
        nivel={b.nivel || null}
        modalidad={b.modalidad || null}
        vigenciaMeses={b.vence ? Number(b.vigencia) || null : null}
      />
      <p className="text-xs text-tinta-tenue">
        Así la verá quien la reciba. Resultados, temas y contexto los decide mostrar el titular al compartirla.
      </p>
    </aside>
  );
}

function Opcion({
  nombre,
  marcada,
  alMarcar,
  children,
}: {
  nombre: string;
  marcada: boolean;
  alMarcar: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-control border px-3 py-2.5 text-sm font-semibold text-tinta transition-colors",
        "hover:border-linea-fuerte has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-marino/40",
        marcada ? "border-tec-azul shadow-[inset_0_0_0_1px_var(--color-tec-azul)]" : "border-linea bg-superficie",
      )}
    >
      <input
        type="radio"
        name={nombre}
        checked={marcada}
        onChange={alMarcar}
        className="size-4 accent-[var(--color-tec-azul)]"
      />
      {children}
    </label>
  );
}
