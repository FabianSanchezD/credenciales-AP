"use client";

import {
  crearFirmanteConSemilla,
  descifrarSemilla,
  cifrarSemilla,
  ErrorApi,
  ETIQUETAS_CATEGORIA,
  ETIQUETAS_TIPO_ID,
  PROVINCIAS,
  type DatosInstitucion,
  type RegistroEmisor,
} from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Boton, Cargando, Campo, Entrada, Identificador, Insignia, Selector, formatearFechaHora } from "@repo/ui";
import { useState, type FormEvent, type ReactNode } from "react";
import { mensajeError } from "../../lib/errores";
import { useConsulta } from "../../lib/use-consulta";
import { reglasContrasena, validarCorreo, validarSitioWeb } from "../../lib/validacion";
import { useEmisor } from "../acceso";
import { ErrorCarga } from "../comun";

const SECCIONES = [
  { id: "cfg-institucion", etiqueta: "Institución" },
  { id: "cfg-representante", etiqueta: "Representante" },
  { id: "cfg-cuenta", etiqueta: "Cuenta" },
];

function SoloLectura({ etiqueta, valor, mono }: { etiqueta: string; valor: ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-semibold text-tinta">{etiqueta}</span>
      <div className={`min-h-10 rounded-control border border-linea bg-hundido px-3 py-2 text-sm [overflow-wrap:anywhere] ${mono ? "font-mono" : ""}`}>{valor}</div>
    </div>
  );
}

function Tarjeta({ id, titulo, descripcion, children }: { id: string; titulo: string; descripcion?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="flex scroll-mt-24 flex-col gap-4 rounded-[10px] border border-linea bg-superficie p-5 sm:p-6">
      <div>
        <h2 id={`${id}-t`} className="text-[17px] font-bold text-tinta">
          {titulo}
        </h2>
        {descripcion && <p className="mt-1 text-[13px] text-tinta-suave">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

export function VistaInstitucion() {
  const { api } = useSesion();
  const emisor = useEmisor();
  const consulta = useConsulta(
    () =>
      api.miRegistro().catch((e: unknown) => {
        // Instituciones registradas solo con wallet no tienen datos de registro.
        if (e instanceof ErrorApi && e.status === 404) return null;
        throw e;
      }),
    `registro:${emisor.id}`,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="text-[13px] text-tinta-suave">Configuración</div>
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight">Configuración</h1>
        <p className="mt-1.5 max-w-[62ch] text-tinta-suave">Datos de la institución, del representante y de la cuenta.</p>
      </div>
      {consulta.error && <ErrorCarga mensaje={consulta.error} alReintentar={consulta.recargar} />}
      {consulta.cargando && consulta.datos === undefined && <Cargando texto="Cargando la configuración" />}
      {consulta.datos !== undefined && (
        <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Secciones" className="rounded-[10px] border border-linea bg-superficie p-2 lg:sticky lg:top-24">
            <ul className="flex gap-0.5 overflow-x-auto lg:flex-col">
              {(consulta.datos ? SECCIONES : SECCIONES.filter((s) => s.id === "cfg-institucion")).map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-tinta hover:bg-hundido">
                    {s.etiqueta}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex min-w-0 flex-col gap-5">
            {consulta.datos ? (
              <FormularioDatos registro={consulta.datos} alGuardar={(r) => consulta.mutar(() => r)} />
            ) : (
              <Aviso tipo="info" titulo="Institución registrada con wallet">
                Esta institución no tiene datos de registro ni contraseña: entra y firma con su propia wallet de Stellar.
              </Aviso>
            )}
            <Tarjeta id="cfg-identidad" titulo="Identidad y autorización" descripcion="Con este DID quien verifica comprueba la firma de cada credencial.">
              <div className="grid gap-4 sm:grid-cols-2">
                <SoloLectura etiqueta="Estado" valor={<Insignia tono="sello">Autorizada</Insignia>} />
                <SoloLectura etiqueta="Autorizada el" valor={formatearFechaHora(emisor.autorizadoEn)} />
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-sm font-semibold text-tinta">DID</span>
                  <Identificador valor={emisor.did} etiqueta="Copiar DID" />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-sm font-semibold text-tinta">Cuenta de firma (Stellar)</span>
                  <Identificador valor={emisor.stellarAddress} etiqueta="Copiar cuenta" />
                </div>
              </div>
            </Tarjeta>
            {consulta.datos && <CambiarContrasena />}
          </div>
        </div>
      )}
    </div>
  );
}

function FormularioDatos({ registro, alGuardar }: { registro: RegistroEmisor; alGuardar: (r: RegistroEmisor) => void }) {
  const { api, refrescar } = useSesion();
  const inicial = () => ({
    sitioWeb: registro.institucion.sitioWeb,
    provincia: registro.institucion.provincia,
    nombre: registro.representante.nombre,
    cargo: registro.representante.cargo,
    correo: registro.representante.correo,
    telefono: registro.representante.telefono,
  });
  const [d, setD] = useState(inicial);
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const original = inicial();
  const sinCambios = (Object.keys(d) as Array<keyof typeof d>).every((k) => d[k].trim() === original[k]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const nuevos = {
      sitioWeb: d.sitioWeb.trim() ? validarSitioWeb(d.sitioWeb) : "Escriba el sitio web de la institución.",
      nombre: d.nombre.trim().split(/\s+/).length < 2 ? "Escriba el nombre y al menos un apellido." : null,
      cargo: d.cargo.trim().length < 3 ? "Escriba el cargo." : null,
      correo: validarCorreo(d.correo),
      telefono: /^[0-9+\-\s]{8,20}$/.test(d.telefono.trim()) ? null : "Escriba un teléfono de 8 dígitos o más.",
    };
    setErrores(nuevos);
    setResultado(null);
    if (Object.values(nuevos).some(Boolean)) return;
    setGuardando(true);
    try {
      const actualizado = await api.actualizarMisDatos({
        sitioWeb: d.sitioWeb.trim(),
        provincia: d.provincia,
        representante: { nombre: d.nombre.trim(), cargo: d.cargo.trim(), correo: d.correo.trim().toLowerCase(), telefono: d.telefono.trim() },
      });
      alGuardar(actualizado);
      await refrescar();
      setResultado({ tipo: "exito", texto: "Los cambios se guardaron." });
    } catch (err) {
      setResultado({ tipo: "error", texto: mensajeError(err) });
    } finally {
      setGuardando(false);
    }
  }

  const { institucion, representante } = registro;
  return (
    <form noValidate onSubmit={(e) => void guardar(e)} className="flex flex-col gap-5">
      <Tarjeta id="cfg-institucion" titulo="Institución">
        <div className="grid gap-4 sm:grid-cols-2">
          <SoloLectura etiqueta="Nombre" valor={institucion.nombre} />
          <SoloLectura etiqueta="Tipo" valor={ETIQUETAS_CATEGORIA[institucion.categoria]} />
          <SoloLectura etiqueta={ETIQUETAS_TIPO_ID[institucion.tipoIdentificacion]} valor={institucion.identificacion} mono />
          <SoloLectura etiqueta="Correo institucional" valor={institucion.correo} />
          <Campo etiqueta="Sitio web" error={errores.sitioWeb}>
            {(p) => <Entrada {...p} type="url" inputMode="url" value={d.sitioWeb} onChange={(e) => setD({ ...d, sitioWeb: e.target.value })} />}
          </Campo>
          <Campo etiqueta="Provincia">
            {(p) => (
              <Selector {...p} value={d.provincia} onChange={(e) => setD({ ...d, provincia: e.target.value as DatosInstitucion["provincia"] })}>
                {PROVINCIAS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </Selector>
            )}
          </Campo>
        </div>
        <Aviso tipo="info">Cambiar el nombre, el tipo, la identificación o el correo requiere una nueva validación del ente que autoriza.</Aviso>
      </Tarjeta>

      <Tarjeta id="cfg-representante" titulo="Representante" descripcion="Sus datos no se publican: solo los ve el ente que autoriza.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre completo" error={errores.nombre}>
            {(p) => <Entrada {...p} value={d.nombre} autoComplete="name" onChange={(e) => setD({ ...d, nombre: e.target.value })} />}
          </Campo>
          <Campo etiqueta="Cargo" error={errores.cargo}>
            {(p) => <Entrada {...p} value={d.cargo} onChange={(e) => setD({ ...d, cargo: e.target.value })} />}
          </Campo>
          <SoloLectura etiqueta={ETIQUETAS_TIPO_ID[representante.tipoIdentificacion]} valor={representante.identificacion} mono />
          <Campo etiqueta="Teléfono" error={errores.telefono}>
            {(p) => <Entrada {...p} type="tel" value={d.telefono} onChange={(e) => setD({ ...d, telefono: e.target.value })} />}
          </Campo>
          <Campo etiqueta="Correo" error={errores.correo} className="sm:col-span-2">
            {(p) => <Entrada {...p} type="email" value={d.correo} onChange={(e) => setD({ ...d, correo: e.target.value })} />}
          </Campo>
        </div>
      </Tarjeta>

      {resultado && <Aviso tipo={resultado.tipo}>{resultado.texto}</Aviso>}
      <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2.5 border-t border-linea bg-niebla py-3.5">
        <Boton
          type="button"
          variante="secundario"
          disabled={sinCambios || guardando}
          onClick={() => {
            setD(inicial());
            setErrores({});
            setResultado(null);
          }}
        >
          Cancelar
        </Boton>
        <Boton type="submit" cargando={guardando} disabled={sinCambios}>
          Guardar cambios
        </Boton>
      </div>
    </form>
  );
}

/**
 * La llave de firma está cifrada con la contraseña: al cambiarla se abre con la
 * actual y se vuelve a cifrar con la nueva, en el navegador.
 */
function CambiarContrasena() {
  const { api, establecerFirmante } = useSesion();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  async function cambiar(e: FormEvent) {
    e.preventDefault();
    const nuevos = {
      actual: actual ? null : "Escriba la contraseña actual.",
      nueva: reglasContrasena(nueva).every((r) => r.cumple) ? null : "La contraseña nueva no cumple los requisitos.",
      repetida: nueva === repetida ? null : "Las contraseñas no coinciden.",
    };
    setErrores(nuevos);
    setResultado(null);
    if (Object.values(nuevos).some(Boolean)) return;
    setGuardando(true);
    try {
      const llave = await api.miLlave().catch((err: unknown) => {
        if (err instanceof ErrorApi && err.status === 404) return null;
        throw err;
      });
      let recifrada: string | null = null;
      if (llave) {
        const semilla = await descifrarSemilla(llave.llaveCifrada, actual).catch(() => {
          throw new Error("La contraseña actual no es correcta.");
        });
        // crearFirmanteConSemilla valida la semilla antes de recifrarla.
        const firmante = crearFirmanteConSemilla(semilla);
        recifrada = await cifrarSemilla(semilla, nueva);
        establecerFirmante(firmante);
      }
      await api.cambiarContrasena(actual, nueva, recifrada);
      setActual("");
      setNueva("");
      setRepetida("");
      setResultado({ tipo: "exito", texto: "La contraseña cambió. Úsela la próxima vez que entre o firme." });
    } catch (err) {
      setResultado({ tipo: "error", texto: mensajeError(err) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => void cambiar(e)}>
      <Tarjeta id="cfg-cuenta" titulo="Cuenta" descripcion="La contraseña también protege la llave con la que la institución firma sus credenciales.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Contraseña actual" error={errores.actual} className="sm:col-span-2">
            {(p) => <Entrada {...p} type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />}
          </Campo>
          <Campo etiqueta="Contraseña nueva" error={errores.nueva}>
            {(p) => <Entrada {...p} type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />}
          </Campo>
          <Campo etiqueta="Repita la contraseña nueva" error={errores.repetida}>
            {(p) => <Entrada {...p} type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />}
          </Campo>
        </div>
        <ul className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-2" aria-label="Requisitos de la contraseña">
          {reglasContrasena(nueva).map(({ regla, cumple }) => (
            <li key={regla} className={cumple ? "text-sello" : "text-tinta-tenue"}>
              {cumple ? "✓" : "○"} {regla}
            </li>
          ))}
        </ul>
        {resultado && <Aviso tipo={resultado.tipo}>{resultado.texto}</Aviso>}
        <div>
          <Boton type="submit" variante="secundario" cargando={guardando}>
            Cambiar contraseña
          </Boton>
        </div>
      </Tarjeta>
    </form>
  );
}
