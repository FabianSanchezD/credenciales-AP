"use client";

import { Boton, Entrada, cn } from "@repo/ui";
import { Plus, Trash2 } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";

export interface Elemento {
  id: string;
  texto: string;
}

let contador = 0;
export function nuevoElemento(texto = ""): Elemento {
  contador += 1;
  return { id: `elemento-${contador}`, texto };
}

/**
 * Lista de textos cortos que la persona agrega y quita, p. ej. los resultados
 * de aprendizaje. Cada entrada tiene su propia etiqueta accesible.
 */
export function ListaEditable({
  etiqueta,
  etiquetaElemento,
  ayuda,
  error,
  elementos,
  alCambiar,
  textoAgregar,
  minimo = 0,
  maximo,
  marcador,
}: {
  etiqueta: string;
  etiquetaElemento: (indice: number) => string;
  ayuda?: ReactNode;
  error?: string | null;
  elementos: Elemento[];
  alCambiar: (elementos: Elemento[]) => void;
  textoAgregar: string;
  minimo?: number;
  maximo?: number;
  marcador?: string;
}) {
  const id = useId();
  const lista = useRef<HTMLUListElement>(null);

  function agregar() {
    alCambiar([...elementos, nuevoElemento()]);
    requestAnimationFrame(() => {
      const entradas = lista.current?.querySelectorAll("input");
      entradas?.[entradas.length - 1]?.focus();
    });
  }

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={`${id}-ayuda ${error ? `${id}-error` : ""}`}>
      <legend className="text-sm font-semibold text-tinta">{etiqueta}</legend>
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-sm text-tinta-tenue">
          {ayuda}
        </p>
      )}
      <ul ref={lista} className="flex flex-col gap-2">
        {elementos.map((elemento, i) => (
          <li key={elemento.id} className="flex items-center gap-2">
            <Entrada
              aria-label={etiquetaElemento(i)}
              aria-invalid={error && !elemento.texto.trim() ? true : undefined}
              value={elemento.texto}
              maxLength={200}
              placeholder={i === 0 ? marcador : undefined}
              onChange={(e) =>
                alCambiar(elementos.map((otro) => (otro.id === elemento.id ? { ...otro, texto: e.target.value } : otro)))
              }
            />
            <button
              type="button"
              disabled={elementos.length <= minimo}
              onClick={() => alCambiar(elementos.filter((otro) => otro.id !== elemento.id))}
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-control text-tinta-tenue transition-colors",
                "hover:bg-hundido hover:text-lacre disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-tinta-tenue",
              )}
            >
              <Trash2 aria-hidden className="size-4" />
              <span className="sr-only">Quitar {etiquetaElemento(i).toLowerCase()}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-lacre">
          {error}
        </p>
      )}
      <div>
        <Boton
          variante="fantasma"
          tamano="sm"
          icono={<Plus aria-hidden className="size-4" />}
          onClick={agregar}
          disabled={maximo !== undefined && elementos.length >= maximo}
        >
          {textoAgregar}
        </Boton>
      </div>
    </fieldset>
  );
}
