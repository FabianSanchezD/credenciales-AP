import { ETIQUETAS_MODALIDAD, ETIQUETAS_NIVEL, type Modalidad, type Nivel } from "@repo/credenciales";

/**
 * Credencial con la identidad TEC: barra azul, marca de agua y secciones que
 * el titular decide revelar. Se usa en el formulario de plantilla y al emitir.
 */
export function VistaPreviaCredencial({
  emisor,
  nombre,
  descripcion,
  resultados,
  temas,
  horas,
  nivel,
  modalidad,
  vigenciaMeses,
  titular,
  calificacion,
}: {
  emisor: string;
  nombre: string;
  descripcion: string;
  resultados: string[];
  temas: string[];
  horas: string | number;
  nivel: Nivel | null;
  modalidad: Modalidad | null;
  vigenciaMeses: number | null;
  titular?: string;
  calificacion?: string;
}) {
  const contexto = [horas ? `${horas} horas` : null, nivel ? ETIQUETAS_NIVEL[nivel] : null, modalidad ? ETIQUETAS_MODALIDAD[modalidad] : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-linea bg-white py-5 pl-7 pr-5 shadow-[0_10px_30px_rgba(0,20,50,0.08)]">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[5px] bg-tec-azul" />
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[52%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 whitespace-nowrap text-tec-azul opacity-[0.08]"
      >
        <span className="font-marca text-[72px] leading-none">TEC</span>
        <span className="h-[62px] w-0.5 bg-tec-rojo" />
        <span className="font-marca text-[21px] leading-tight">
          Tecnológico
          <br />
          de Costa Rica
        </span>
      </span>
      <span className="relative text-[10.5px] font-medium uppercase tracking-[0.14em] text-lacre">Credencial verificable</span>
      <h3 className="relative text-[19px] font-bold leading-tight text-tinta">{nombre || "Nombre del curso o logro"}</h3>
      <span className="relative text-[12.5px] text-tinta-suave">{emisor}</span>
      {titular ? (
        <span className="relative font-mono text-[11.5px] text-tinta-suave [overflow-wrap:anywhere]">{titular}</span>
      ) : (
        <span aria-hidden className="relative h-2 w-[55%] rounded-sm bg-linea" />
      )}
      {descripcion && <p className="relative line-clamp-3 text-[12.5px] text-tinta-suave">{descripcion}</p>}
      <dl className="relative m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12.5px]">
        <dt className="text-tinta-tenue">Vigencia</dt>
        <dd className="m-0">{vigenciaMeses ? `${vigenciaMeses} meses` : "No vence"}</dd>
        {calificacion && (
          <>
            <dt className="text-tinta-tenue">Calificación</dt>
            <dd className="m-0">{calificacion}</dd>
          </>
        )}
      </dl>
      <Seccion titulo="Resultados de aprendizaje">
        {resultados.length > 0 ? (
          <ul className="m-0 pl-4 text-tinta-suave">
            {resultados.slice(0, 3).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
            {resultados.length > 3 && <li className="list-none">y {resultados.length - 3} más</li>}
          </ul>
        ) : (
          <span className="text-tinta-tenue">Agregue al menos uno.</span>
        )}
      </Seccion>
      {temas.length > 0 && <Seccion titulo="Temas evaluados"><span className="text-tinta-suave">{temas.join(", ")}</span></Seccion>}
      {contexto && <Seccion titulo="Contexto"><span className="text-tinta-suave">{contexto}</span></Seccion>}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col gap-1.5 border-t border-dashed border-linea pt-2.5 text-[12.5px]">
      <b className="flex justify-between gap-2 text-xs font-medium">
        {titulo}
        <span className="whitespace-nowrap rounded-full bg-lacre-claro px-[7px] py-px text-[10.5px] font-medium text-lacre">El titular decide</span>
      </b>
      {children}
    </div>
  );
}
