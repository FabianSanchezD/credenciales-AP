"use client";

import { Boton, Campo, Dialogo, Entrada } from "@repo/ui";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

type PedirContrasena = () => Promise<string>;

const Contexto = createContext<PedirContrasena | null>(null);

/**
 * Pide la contraseña de la cuenta para abrir la llave de firma de la
 * institución (p. ej. tras recargar la página). Es el «Confirmar firma» del
 * diseño: la llave se descifra en el navegador y nunca sale de él.
 */
export function ProveedorFirma({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  // `showModal` enfoca el primer botón (cerrar): llevamos el foco a la contraseña.
  useEffect(() => {
    if (!abierto) return;
    const id = window.setTimeout(() => document.querySelector<HTMLInputElement>("#form-firma input")?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [abierto]);
  const pendiente = useRef<{ resolver: (v: string) => void; rechazar: (e: Error) => void } | null>(null);

  const pedir = useCallback<PedirContrasena>(
    () =>
      new Promise<string>((resolver, rechazar) => {
        pendiente.current = { resolver, rechazar };
        setContrasena("");
        setError(null);
        setAbierto(true);
      }),
    [],
  );

  function cerrar() {
    setAbierto(false);
    pendiente.current?.rechazar(new Error("Se canceló la firma."));
    pendiente.current = null;
  }

  function confirmar(evento: FormEvent) {
    evento.preventDefault();
    if (!contrasena) {
      setError("Escriba la contraseña de la cuenta.");
      return;
    }
    const actual = pendiente.current;
    pendiente.current = null;
    setAbierto(false);
    actual?.resolver(contrasena);
  }

  return (
    <Contexto.Provider value={pedir}>
      {children}
      {abierto && (
        <Dialogo
          abierto
          alCerrar={cerrar}
          titulo="Confirmar firma"
          descripcion="Escriba la contraseña de la cuenta para firmar con la llave de la institución."
          acciones={
            <>
              <Boton type="button" variante="fantasma" onClick={cerrar}>
                Cancelar
              </Boton>
              <Boton type="submit" form="form-firma">
                Firmar
              </Boton>
            </>
          }
        >
          <form id="form-firma" noValidate onSubmit={confirmar}>
            <Campo etiqueta="Contraseña" error={error}>
              {(p) => (
                <Entrada
                  {...p}
                  type="password"
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                />
              )}
            </Campo>
          </form>
        </Dialogo>
      )}
    </Contexto.Provider>
  );
}

export function usePedirContrasena(): PedirContrasena {
  const pedir = useContext(Contexto);
  if (!pedir) throw new Error("usePedirContrasena debe usarse dentro de <ProveedorFirma>");
  return pedir;
}
