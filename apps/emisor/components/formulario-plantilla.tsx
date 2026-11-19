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
import { useState, type FormEvent, type ReactNode } from "react";
import { mensajeError } from "../lib/errores";
import { ListaEditable, nuevoElemento, type Elemento } from "./lista-editable";

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

  if (!nombre) errores.nombre = "Escribe el nombre del curso o logro.";
  else if (nombre.length > 200) errores.nombre = "El nombre puede tener hasta 200 caracteres.";
  if (!descripcion) errores.descripcion = "Describe en pocas líneas qué acredita esta credencial.";
  else if (descripcion.length > 2000) errores.descripcion = "La descripción puede tener hasta 2000 caracteres.";
  if (resultados.length === 0) {
    errores.resultados = "Agrega al menos un resultado de aprendizaje.";
  } else if (resultados.length > 30) {
    errores.resultados = "Puedes registrar hasta 30 resultados de aprendizaje.";
  }
  if (temas.length > 50) errores.temas = "Puedes registrar hasta 50 temas evaluados.";
  if (!b.horas.trim()) errores.horas = "Indica la duración en horas.";
  else if (!Number.isFinite(horas) || horas <= 0 || horas > 10000) {
    errores.horas = "Escribe un número de horas mayor que 0 y hasta 10 000.";
  }
  if (!b.nivel) errores.nivel = "Elige el nivel.";
  if (!b.modalidad) errores.modalidad = "Elige la modalidad.";
  if (!b.tipo) errores.tipo = "Indica si el aprendizaje es formal o no formal.";
  if (b.vence && (!Number.isInteger(vigencia) || vigencia <= 0 || vigencia > 600)) {
    errores.vigencia = "Escribe un número entero de meses, entre 1 y 600.";
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
      else if (raiz === "contexto" && sub === "horas") errores.horas = "Revisa la cantidad de horas.";
      else if (raiz === "vigenciaMeses") errores.vigencia = "Revisa los meses de vigencia.";
      else errores.nombre ??= "Revisa los datos de la plantilla.";
    }
    return { contenido: null, errores };
  }
  return { contenido: resultado.data, errores };
}

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion: ReactNode; children: ReactNode }) {
  return (
    <Panel className="grid gap-6 md:grid-cols-[minmax(0,16rem)_1fr] md:gap-10">
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
}: {
  plantilla?: Plantilla;
  textoGuardar: string;
  alGuardar: (contenido: ContenidoPlantilla) => Promise<void>;
  alCancelar?: () => void;
}) {
  const [b, setB] = useState<Borrador>(() => inicial(plantilla));
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
      setError("Revisa los campos marcados antes de guardar.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await alGuardar(contenido);
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la plantilla. Intenta de nuevo."));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-5">
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
            <p className="mt-2">Escribe cada resultado como algo que la persona puede hacer.</p>
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
                  Elige un nivel
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
                  Elige una modalidad
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
        Este contenido es de tu institución. La plataforma solo revisa que esté completo y nunca lo
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
        marcada ? "border-sello bg-sello-claro" : "border-linea bg-superficie",
      )}
    >
      <input
        type="radio"
        name={nombre}
        checked={marcada}
        onChange={alMarcar}
        className="size-4 accent-[var(--color-sello)]"
      />
      {children}
    </label>
  );
}
