"use client";

import { CATEGORIAS_EMISOR, ETIQUETAS_CATEGORIA, type CategoriaEmisor } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Boton, Campo, Entrada, Identificador, Panel, Selector } from "@repo/ui";
import { useState, type FormEvent } from "react";
import { mensajeError } from "../lib/errores";
import { validarSitioWeb } from "../lib/validacion";

/** Registro de la institución la primera vez que entra con su cuenta. */
export function RegistroEmisor() {
  const { api, sesion, refrescar } = useSesion();
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<CategoriaEmisor | "">("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const nuevos: Record<string, string> = {};
    if (!nombre.trim()) nuevos.nombre = "Escribe el nombre oficial de la institución.";
    else if (nombre.trim().length > 200) nuevos.nombre = "El nombre puede tener hasta 200 caracteres.";
    if (!categoria) nuevos.categoria = "Elige la categoría que mejor describe a la institución.";
    const errorSitio = validarSitioWeb(sitioWeb);
    if (errorSitio) nuevos.sitioWeb = errorSitio;
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0 || !categoria) return;

    setEnviando(true);
    setError(null);
    try {
      await api.registrarEmisor({
        nombre: nombre.trim(),
        categoria,
        sitioWeb: sitioWeb.trim() || null,
      });
      await refrescar();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 py-2 sm:py-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight text-marino">Registra tu institución</h1>
        <p className="mt-2 text-tinta-suave">
          Esta cuenta todavía no está asociada a ninguna institución. Completa los datos y la entidad
          que autoriza revisará la solicitud antes de que puedas emitir credenciales.
        </p>
      </div>
      <Panel>
        <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-5">
          <Campo etiqueta="Nombre de la institución" error={errores.nombre}>
            {(props) => (
              <Entrada
                {...props}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="organization"
                maxLength={200}
              />
            )}
          </Campo>
          <Campo
            etiqueta="Categoría"
            error={errores.categoria}
            ayuda="Ayuda a quien verifica a entender qué tipo de institución emite la credencial."
          >
            {(props) => (
              <Selector
                {...props}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaEmisor)}
              >
                <option value="" disabled>
                  Elige una categoría
                </option>
                {CATEGORIAS_EMISOR.map((valor) => (
                  <option key={valor} value={valor}>
                    {ETIQUETAS_CATEGORIA[valor]}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Sitio web" opcional error={errores.sitioWeb} ayuda="Por ejemplo, https://www.institucion.ac.cr">
            {(props) => (
              <Entrada
                {...props}
                type="url"
                inputMode="url"
                value={sitioWeb}
                onChange={(e) => setSitioWeb(e.target.value)}
                autoComplete="url"
              />
            )}
          </Campo>
          {sesion && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-tinta">Cuenta que firmará las credenciales</span>
              <span>
                <Identificador valor={sesion.address} etiqueta="Copiar cuenta" />
              </span>
            </div>
          )}
          {error && (
            <Aviso tipo="error" titulo="No se pudo enviar la solicitud">
              {error}
            </Aviso>
          )}
          <div>
            <Boton type="submit" cargando={enviando}>
              Enviar solicitud de registro
            </Boton>
          </div>
        </form>
      </Panel>
    </div>
  );
}
