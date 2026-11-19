"use client";

import { ETIQUETAS_CATEGORIA } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import {
  Aviso,
  Boton,
  Campo,
  EncabezadoPagina,
  Entrada,
  Identificador,
  Insignia,
  ListaDatos,
  Panel,
  formatearFechaHora,
} from "@repo/ui";
import { useState, type FormEvent } from "react";
import { mensajeError } from "../../lib/errores";
import { validarSitioWeb } from "../../lib/validacion";
import { useEmisor } from "../acceso";

export function VistaInstitucion() {
  const { api, refrescar } = useSesion();
  const emisor = useEmisor();
  const [nombre, setNombre] = useState(emisor.nombre);
  const [sitioWeb, setSitioWeb] = useState(emisor.sitioWeb ?? "");
  const [errores, setErrores] = useState<{ nombre?: string; sitioWeb?: string }>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const sinCambios = nombre.trim() === emisor.nombre && (sitioWeb.trim() || null) === emisor.sitioWeb;

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const nuevos: typeof errores = {};
    if (!nombre.trim()) nuevos.nombre = "Escribe el nombre de la institución.";
    else if (nombre.trim().length > 200) nuevos.nombre = "El nombre puede tener hasta 200 caracteres.";
    const errorSitio = validarSitioWeb(sitioWeb);
    if (errorSitio) nuevos.sitioWeb = errorSitio;
    setErrores(nuevos);
    setGuardado(false);
    if (Object.keys(nuevos).length > 0) return;
    setGuardando(true);
    setError(null);
    try {
      await api.actualizarEmisor(emisor.id, { nombre: nombre.trim(), sitioWeb: sitioWeb.trim() || null });
      await refrescar();
      setGuardado(true);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Institución"
        descripcion="Los datos con los que tu institución aparece en las credenciales y en el registro de emisores autorizados."
      />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Panel>
          <h2 className="mb-4 text-lg font-semibold text-tinta">Datos públicos</h2>
          <form onSubmit={(e) => void guardar(e)} noValidate className="flex flex-col gap-5">
            <Campo
              etiqueta="Nombre de la institución"
              error={errores.nombre}
              ayuda="Las credenciales ya emitidas conservan el nombre con el que se firmaron."
            >
              {(props) => (
                <Entrada {...props} value={nombre} maxLength={200} onChange={(e) => setNombre(e.target.value)} />
              )}
            </Campo>
            <Campo etiqueta="Sitio web" opcional error={errores.sitioWeb}>
              {(props) => (
                <Entrada
                  {...props}
                  type="url"
                  inputMode="url"
                  value={sitioWeb}
                  onChange={(e) => setSitioWeb(e.target.value)}
                />
              )}
            </Campo>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-tinta">Categoría</span>
              <span className="text-tinta">{ETIQUETAS_CATEGORIA[emisor.categoria]}</span>
              <span className="text-sm text-tinta-tenue">
                La define la entidad que autoriza. Para cambiarla, comunícate con ella.
              </span>
            </div>
            {error && (
              <Aviso tipo="error" titulo="No se guardaron los cambios">
                {error}
              </Aviso>
            )}
            {guardado && <Aviso tipo="exito">Los cambios se guardaron.</Aviso>}
            <div>
              <Boton type="submit" cargando={guardando} disabled={sinCambios}>
                Guardar cambios
              </Boton>
            </div>
          </form>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-lg font-semibold text-tinta">Identidad y autorización</h2>
          <ListaDatos
            datos={[
              { termino: "Estado", valor: <Insignia tono="sello">Autorizada</Insignia> },
              { termino: "Autorizada el", valor: formatearFechaHora(emisor.autorizadoEn) },
              { termino: "DID", valor: <Identificador valor={emisor.did} etiqueta="Copiar DID" /> },
              {
                termino: "Cuenta de Stellar",
                valor: <Identificador valor={emisor.stellarAddress} etiqueta="Copiar cuenta" />,
              },
              { termino: "Registrada el", valor: formatearFechaHora(emisor.creadoEn) },
            ]}
          />
          <p className="mt-5 text-sm text-tinta-tenue">
            Esta cuenta firma cada credencial y paga la comisión de red de los anclajes. Quien verifica
            comprueba la firma contra este DID.
          </p>
        </Panel>
      </div>
    </>
  );
}
