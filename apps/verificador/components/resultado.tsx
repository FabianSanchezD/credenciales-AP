"use client";

import { ETIQUETAS_CATEGORIA, type IdComprobacion, type ResultadoVerificacion } from "@repo/cliente";
import {
  ATRIBUTOS_SELECCIONABLES,
  ETIQUETAS_ATRIBUTO,
  ETIQUETAS_MODALIDAD,
  ETIQUETAS_NIVEL,
  ETIQUETAS_TIPO_APRENDIZAJE,
  type AtributosSeleccionables,
} from "@repo/credenciales";
import {
  Identificador,
  Insignia,
  ListaDatos,
  Panel,
  Sello,
  clasesBoton,
  cn,
  formatearFecha,
  formatearFechaHora,
} from "@repo/ui";
import { CircleCheck, CircleX, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const TITULARES: Record<ResultadoVerificacion["resultado"], string> = {
  valida: "Credencial válida",
  revocada: "Credencial revocada",
  invalida: "Esta credencial no es válida",
};

const NOMBRES_COMPROBACION: Record<IdComprobacion, string> = {
  firma: "Firma del emisor",
  integridad: "Integridad",
  estado: "Estado",
  emisor: "Emisor autorizado",
};

const ORDEN_COMPROBACIONES: IdComprobacion[] = ["firma", "integridad", "estado", "emisor"];

const segundos = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function titularResultado(resultado: ResultadoVerificacion): string {
  return `${TITULARES[resultado.resultado]}. Emitida por ${nombreEmisor(resultado)}.`;
}

function nombreEmisor(resultado: ResultadoVerificacion): string {
  return resultado.emisor?.nombre ?? resultado.emisorDeclarado.nombre;
}

function explicacion(resultado: ResultadoVerificacion): string {
  const emisor = nombreEmisor(resultado);
  if (resultado.resultado === "valida") {
    return `${emisor} otorgó este logro, nadie ha cambiado la credencial desde entonces y sigue vigente. Puedes tomarla como prueba.`;
  }
  if (resultado.resultado === "revocada") {
    const fecha = resultado.revocadaEn ? ` el ${formatearFecha(resultado.revocadaEn)}` : "";
    return `${emisor} emitió esta credencial, pero la retiró${fecha}. La institución ya no respalda este logro.`;
  }
  return "No pudimos confirmar que esta credencial sea auténtica y esté intacta. No la tomes como prueba del logro; abajo ves qué comprobación no se superó.";
}

export function Resultado({ resultado }: { resultado: ResultadoVerificacion }) {
  const estado = resultado.resultado;
  const valida = estado === "valida";

  return (
    <div className="flex flex-col gap-6">
      <article
        aria-labelledby="titular-resultado"
        className="relative overflow-hidden rounded-documento border border-linea bg-superficie shadow-documento"
      >
        <div aria-hidden className={cn("absolute inset-x-0 top-0 h-1.5", valida ? "bg-sello" : "bg-lacre")} />

        <div className="flex flex-col items-center gap-4 px-5 pb-7 pt-9 text-center sm:px-10 sm:pt-11">
          <Sello estado={estado} tamano={176} estampar className="size-36 sm:size-44" />
          <h1
            id="titular-resultado"
            className={cn("mt-2 text-[1.75rem] font-bold leading-tight sm:text-[2rem]", valida ? "text-tinta" : "text-lacre")}
          >
            {TITULARES[estado]}
          </h1>
          <p className="max-w-lg text-tinta-suave">{explicacion(resultado)}</p>
        </div>

        <div className="flex flex-col gap-6 border-t border-linea px-5 py-6 sm:px-10 sm:py-8">
          <Emisor resultado={resultado} />
          <div>
            <h2
              className={cn(
                "font-serif text-2xl font-medium leading-tight text-tinta sm:text-[1.875rem]",
                !valida && "text-tinta-suave line-through decoration-lacre/60 decoration-2",
              )}
            >
              {resultado.logro.nombre}
            </h2>
            {resultado.logro.descripcion && (
              <p className="mt-3 max-w-prose text-tinta-suave">{resultado.logro.descripcion}</p>
            )}
          </div>
          <ListaDatos
            datos={[
              { termino: "Emitida el", valor: formatearFecha(resultado.emitidaEn) },
              {
                termino: "Válida hasta",
                valor: resultado.validaHasta ? formatearFecha(resultado.validaHasta) : "No tiene fecha de vencimiento",
              },
              ...(resultado.revocadaEn
                ? [
                    {
                      termino: "Revocada el",
                      valor: <span className="font-semibold text-lacre">{formatearFecha(resultado.revocadaEn)}</span>,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </article>

      <Atributos atributos={resultado.atributos} />
      <Comprobaciones resultado={resultado} />
      <Pie resultado={resultado} />
    </div>
  );
}

function Emisor({ resultado }: { resultado: ResultadoVerificacion }) {
  const { emisor, emisorDeclarado } = resultado;
  if (!emisor) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-tinta-tenue">Dice venir de</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-tinta">{emisorDeclarado.nombre}</p>
          <Insignia tono="lacre">No está registrada</Insignia>
        </div>
        <p className="text-sm text-tinta-suave">
          Esta institución no aparece en el registro de emisores autorizados de la plataforma. No podemos
          confirmar que sea quien dice ser.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-tinta-tenue">Emitida por</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-lg font-semibold text-tinta">{emisor.nombre}</p>
        <Insignia tono="neutro">{ETIQUETAS_CATEGORIA[emisor.categoria]}</Insignia>
      </div>
      {emisor.sitioWeb && (
        <a
          href={emisor.sitioWeb}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 self-start rounded-control text-sm font-medium text-marino underline-offset-4 hover:underline"
        >
          {sitioLegible(emisor.sitioWeb)}
          <ExternalLink aria-hidden className="size-3.5" />
          <span className="sr-only">(se abre en otra pestaña)</span>
        </a>
      )}
    </div>
  );
}

function sitioLegible(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Atributos({ atributos }: { atributos: Partial<AtributosSeleccionables> }) {
  const revelados = ATRIBUTOS_SELECCIONABLES.filter((clave) => atributos[clave] !== undefined);

  return (
    <Panel className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-tinta">Lo que la persona titular decidió mostrarte</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          Puede haber ocultado otros datos de esta credencial. Cada dato que ves aquí fue comprobado contra la
          firma de la institución.
        </p>
      </div>
      {revelados.length === 0 ? (
        <p className="text-tinta-suave">No compartió detalles adicionales del logro.</p>
      ) : (
        <ListaDatos
          className="sm:grid-cols-[minmax(10rem,auto)_1fr]"
          datos={revelados.map((clave) => ({
            termino: ETIQUETAS_ATRIBUTO[clave],
            valor: <ValorAtributo atributos={atributos} clave={clave} />,
          }))}
        />
      )}
    </Panel>
  );
}

function ValorAtributo({
  atributos,
  clave,
}: {
  atributos: Partial<AtributosSeleccionables>;
  clave: (typeof ATRIBUTOS_SELECCIONABLES)[number];
}): ReactNode {
  if (clave === "contexto" && atributos.contexto) {
    const c = atributos.contexto;
    return (
      <ul className="flex flex-col gap-0.5">
        <li>
          <span className="cifras">{c.horas}</span> horas de formación
        </li>
        <li>Nivel {ETIQUETAS_NIVEL[c.nivel].toLowerCase()}</li>
        <li>Modalidad {ETIQUETAS_MODALIDAD[c.modalidad].toLowerCase()}</li>
        <li>Aprendizaje {ETIQUETAS_TIPO_APRENDIZAJE[c.tipoAprendizaje].toLowerCase()}</li>
      </ul>
    );
  }
  if (clave === "calificacion") return atributos.calificacion;
  const lista = clave === "resultadosAprendizaje" ? atributos.resultadosAprendizaje : atributos.temasEvaluados;
  if (!lista || lista.length === 0) return <span className="text-tinta-suave">Ninguno</span>;
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-tinta-tenue">
      {lista.map((elemento, i) => (
        <li key={i}>{elemento}</li>
      ))}
    </ul>
  );
}

function Comprobaciones({ resultado }: { resultado: ResultadoVerificacion }) {
  const resaltarFallas = resultado.resultado !== "valida";
  const comprobaciones = [...resultado.comprobaciones].sort(
    (a, b) => ORDEN_COMPROBACIONES.indexOf(a.id) - ORDEN_COMPROBACIONES.indexOf(b.id),
  );

  return (
    <Panel className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-tinta">Qué comprobamos</h2>
      <ul className="flex flex-col gap-1">
        {comprobaciones.map((comprobacion) => {
          const falla = !comprobacion.ok;
          return (
            <li
              key={comprobacion.id}
              className={cn(
                "flex gap-3 rounded-control px-3 py-3 -mx-3",
                falla && resaltarFallas && "bg-lacre-claro",
              )}
            >
              {falla ? (
                <CircleX aria-hidden className="mt-0.5 size-5 shrink-0 text-lacre" />
              ) : (
                <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-sello" />
              )}
              <div className="min-w-0">
                <p className={cn("font-semibold", falla ? "text-lacre-hondo" : "text-tinta")}>
                  {NOMBRES_COMPROBACION[comprobacion.id] ?? comprobacion.id}
                  <span className="sr-only">{falla ? ": no superada" : ": superada"}</span>
                </p>
                <p className="text-sm text-tinta-suave">{comprobacion.detalle}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function Pie({ resultado }: { resultado: ResultadoVerificacion }) {
  return (
    <footer className="flex flex-col gap-4 px-1 text-sm text-tinta-tenue">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <span>Persona titular</span>
        <Identificador valor={resultado.titularDid} etiqueta="Copiar identificador" />
      </div>
      <p>
        Verificado el {formatearFechaHora(resultado.verificadaEn)} en{" "}
        <span className="cifras">{segundos.format(resultado.duracionMs / 1000)}</span> s
      </p>
      <p>Esta página no guardó la credencial ni tus datos.</p>
      <Link href="/" className={cn(clasesBoton({ variante: "secundario" }), "self-start")}>
        Verificar otra credencial
      </Link>
    </footer>
  );
}
