"use client";

import {
  CATEGORIAS_REGISTRO,
  crearCuentaDeFirma,
  ETIQUETAS_CATEGORIA,
  ETIQUETAS_TIPO_ID,
  PROVINCIAS,
  TIPOS_ID_INSTITUCION,
  TIPOS_ID_PERSONA,
  type DatosInstitucion,
  type DatosRepresentante,
  type RegistroEmisor as Registro,
} from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Boton, Campo, Dialogo, Entrada, ListaDatos, Selector } from "@repo/ui";
import { cn } from "@repo/ui";
import { ArrowLeft, ArrowRight, Check, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { env } from "../lib/env";
import { mensajeError } from "../lib/errores";
import { reglasContrasena, validarCorreo, validarIdentificacion, validarSitioWeb } from "../lib/validacion";

type Paso = "institucion" | "representante" | "cuenta" | "revision";

const PASOS_NUEVA: Array<{ id: Paso; etiqueta: string }> = [
  { id: "institucion", etiqueta: "Institución" },
  { id: "representante", etiqueta: "Representante" },
  { id: "cuenta", etiqueta: "Contraseña" },
  { id: "revision", etiqueta: "Revisión" },
];
const PASOS_CORRECCION = PASOS_NUEVA.filter((p) => p.id !== "cuenta");

type Errores = Record<string, string | null | undefined>;

const VACIO_INSTITUCION: DatosInstitucion = {
  nombre: "",
  categoria: "universidad_publica",
  tipoIdentificacion: "cedula_juridica",
  identificacion: "",
  correo: "",
  sitioWeb: "",
  provincia: "San José",
};
const VACIO_REPRESENTANTE: DatosRepresentante = {
  nombre: "",
  tipoIdentificacion: "cedula_fisica",
  identificacion: "",
  cargo: "",
  correo: "",
  telefono: "",
};

/** Datos ficticios para probar en testnet. El correo cambia en cada uso. */
function datosDeEjemplo() {
  const sufijo = Math.random().toString(36).slice(2, 7);
  return {
    institucion: {
      nombre: "Instituto de Ciencias Aplicadas de Ejemplo",
      categoria: "universidad_publica",
      tipoIdentificacion: "cedula_juridica",
      identificacion: "4-000-042069",
      correo: `registro.${sufijo}@ciencias-ejemplo.ac.cr`,
      sitioWeb: "https://ciencias-ejemplo.ac.cr",
      provincia: "Cartago",
    } satisfies DatosInstitucion,
    representante: {
      nombre: "María Fernanda Solano Rojas",
      tipoIdentificacion: "cedula_fisica",
      identificacion: "1-1234-0567",
      cargo: "Directora de Extensión",
      correo: `msolano.${sufijo}@ciencias-ejemplo.ac.cr`,
      telefono: "2550-0000",
    } satisfies DatosRepresentante,
    contrasena: "Ejemplo#2026",
  };
}

function validarInstitucion(d: DatosInstitucion, conCorreo: boolean): Errores {
  return {
    nombre: d.nombre.trim().length < 5 ? "Escribe el nombre completo de la institución." : null,
    identificacion: validarIdentificacion(d.tipoIdentificacion, d.identificacion),
    correo: conCorreo ? validarCorreo(d.correo, true) : null,
    sitioWeb: d.sitioWeb.trim() ? validarSitioWeb(d.sitioWeb) : "Escribe el sitio web de la institución.",
  };
}

function validarRepresentante(d: DatosRepresentante): Errores {
  return {
    nombre: d.nombre.trim().split(/\s+/).length < 2 ? "Escribe el nombre y al menos un apellido." : null,
    identificacion: validarIdentificacion(d.tipoIdentificacion, d.identificacion),
    cargo: d.cargo.trim().length < 3 ? "Escribe el cargo en la institución." : null,
    correo: validarCorreo(d.correo),
    telefono: /^[0-9+\-\s]{8,20}$/.test(d.telefono.trim()) ? null : "Escribe un teléfono de 8 dígitos o más.",
  };
}

const hayErrores = (e: Errores) => Object.values(e).some(Boolean);

/**
 * Crear la cuenta de una institución (o corregir su solicitud). La cuenta
 * queda pendiente hasta que la entidad que autoriza la revise.
 */
export function RegistroEmisor({ correccion }: { correccion?: Registro } = {}) {
  const { api, adoptarSesion, refrescar } = useSesion();
  const corrigiendo = Boolean(correccion);
  const pasos = corrigiendo ? PASOS_CORRECCION : PASOS_NUEVA;
  const [indice, setIndice] = useState(0);
  const paso = pasos[indice]!.id;

  const [institucion, setInstitucion] = useState<DatosInstitucion>(correccion?.institucion ?? VACIO_INSTITUCION);
  const [representante, setRepresentante] = useState<DatosRepresentante>(
    correccion?.representante ?? VACIO_REPRESENTANTE,
  );
  const [contrasena, setContrasena] = useState("");
  const [contrasena2, setContrasena2] = useState("");
  const [verificacion, setVerificacion] = useState<{ correo: string; id: string } | null>(null);
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [verificandoCorreo, setVerificandoCorreo] = useState<{ codigoDesarrollo?: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<string | null>(null);

  const correoVerificado = verificacion?.correo === institucion.correo.trim().toLowerCase();
  const enTestnet = env.stellarNetwork === "testnet";

  function ir(destino: number) {
    setErrores({});
    setError(null);
    setIndice(destino);
    window.scrollTo({ top: 0 });
  }

  function usarEjemplo() {
    const ejemplo = datosDeEjemplo();
    setInstitucion(corrigiendo ? { ...ejemplo.institucion, correo: institucion.correo } : ejemplo.institucion);
    setRepresentante(ejemplo.representante);
    if (!corrigiendo) {
      setContrasena(ejemplo.contrasena);
      setContrasena2(ejemplo.contrasena);
    }
    setErrores({});
  }

  async function siguiente(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    if (paso === "institucion") {
      const e = validarInstitucion(institucion, !corrigiendo);
      setErrores(e);
      if (!hayErrores(e)) ir(indice + 1);
    } else if (paso === "representante") {
      const e = validarRepresentante(representante);
      setErrores(e);
      if (!hayErrores(e)) ir(indice + 1);
    } else if (paso === "cuenta") {
      const e: Errores = {
        contrasena: reglasContrasena(contrasena).every((r) => r.cumple) ? null : "La contraseña no cumple los requisitos.",
        contrasena2: contrasena === contrasena2 ? null : "Las contraseñas no coinciden.",
      };
      setErrores(e);
      if (hayErrores(e)) return;
      if (correoVerificado) ir(indice + 1);
      else await pedirCodigo();
    } else {
      await enviar();
    }
  }

  async function pedirCodigo() {
    setOcupado(true);
    try {
      const enviado = await api.enviarCodigoCorreo(institucion.correo.trim().toLowerCase());
      setVerificandoCorreo({ codigoDesarrollo: enviado.codigoDesarrollo });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  async function enviar() {
    if (!acepta) {
      setErrores({ acepta: "Confirme la declaración para enviar la solicitud." });
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      if (correccion) {
        const { correo: _correo, ...datos } = institucion;
        await api.corregirRegistro({ institucion: datos, representante });
        await refrescar();
        return;
      }
      if (!verificacion) throw new Error("Verifique el correo antes de enviar la solicitud.");
      // La cuenta de firma se crea por detrás: la institución no ve ninguna wallet.
      setProgreso("Creando la cuenta de firma de la institución…");
      const { firmante, llaveCifrada } = await crearCuentaDeFirma({
        network: env.stellarNetwork,
        horizonUrl: env.stellarHorizonUrl,
        contrasena,
      });
      setProgreso("Enviando la solicitud…");
      const desafio = await api.crearDesafio(firmante.address, "emisor");
      const firma = await firmante.firmarMensaje(desafio.mensaje);
      const sesion = await api.crearCuentaEmisor({
        institucion: { ...institucion, correo: institucion.correo.trim().toLowerCase() },
        representante,
        contrasena,
        verificacionId: verificacion.id,
        desafioId: desafio.desafioId,
        firma,
        llaveCifrada,
      });
      adoptarSesion(sesion, firmante);
    } catch (e) {
      setError(mensajeError(e));
      setProgreso(null);
      setOcupado(false);
    }
  }

  const titulo = corrigiendo ? "Corregir la solicitud" : "Crear cuenta";

  return (
    <div className="flex flex-col gap-5">
      <div className="text-sm text-tinta-suave">
        Portal del emisor › {titulo} › Paso {indice + 1} de {pasos.length}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ol className="flex gap-1 overflow-x-auto rounded-xl border border-linea bg-superficie p-3 lg:flex-col lg:p-4">
          {pasos.map((p, i) => (
            <li
              key={p.id}
              aria-current={i === indice ? "step" : undefined}
              className={cn(
                "grid shrink-0 grid-cols-[28px_auto] items-center gap-2.5 rounded-lg p-2 text-sm",
                i === indice && "bg-marino-claro font-medium",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-[26px] place-items-center rounded-full border text-xs font-bold",
                  i === indice && "border-tec-azul bg-tec-azul text-white",
                  i < indice && "border-sello bg-sello-claro text-sello",
                  i > indice && "border-linea text-tinta-tenue",
                )}
              >
                {i < indice ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span>{p.etiqueta}</span>
            </li>
          ))}
        </ol>

        <form noValidate onSubmit={(e) => void siguiente(e)} className="flex flex-col gap-5 rounded-xl border border-linea bg-superficie p-5 sm:p-7">
          {paso === "institucion" && (
            <>
              <Encabezado titulo="Datos de la institución">
                {corrigiendo
                  ? "Corrija lo que pidió la entidad que autoriza. El correo es el usuario de la cuenta y no cambia."
                  : "Estos datos los revisa la entidad que autoriza antes de habilitar la emisión."}
              </Encabezado>
              {enTestnet && (
                <Aviso tipo="info" accion={<Boton type="button" tamano="sm" variante="secundario" onClick={usarEjemplo}>Usar datos de ejemplo</Boton>}>
                  Está en testnet: puede rellenar el formulario con datos ficticios para probar.
                </Aviso>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre completo de la institución" error={errores.nombre} className="sm:col-span-2">
                  {(p) => <Entrada {...p} value={institucion.nombre} autoComplete="organization" maxLength={200} onChange={(e) => setInstitucion({ ...institucion, nombre: e.target.value })} />}
                </Campo>
                <Campo etiqueta="Tipo de institución">
                  {(p) => (
                    <Selector {...p} value={institucion.categoria} onChange={(e) => setInstitucion({ ...institucion, categoria: e.target.value as DatosInstitucion["categoria"] })}>
                      {(corrigiendo && !(CATEGORIAS_REGISTRO as readonly string[]).includes(institucion.categoria)
                        ? [institucion.categoria, ...CATEGORIAS_REGISTRO]
                        : CATEGORIAS_REGISTRO
                      ).map((c) => (
                        <option key={c} value={c}>{ETIQUETAS_CATEGORIA[c]}</option>
                      ))}
                    </Selector>
                  )}
                </Campo>
                <Campo etiqueta="Provincia">
                  {(p) => (
                    <Selector {...p} value={institucion.provincia} onChange={(e) => setInstitucion({ ...institucion, provincia: e.target.value as DatosInstitucion["provincia"] })}>
                      {PROVINCIAS.map((v) => <option key={v}>{v}</option>)}
                    </Selector>
                  )}
                </Campo>
                <Campo etiqueta="Tipo de identificación">
                  {(p) => (
                    <Selector {...p} value={institucion.tipoIdentificacion} onChange={(e) => setInstitucion({ ...institucion, tipoIdentificacion: e.target.value as DatosInstitucion["tipoIdentificacion"] })}>
                      {TIPOS_ID_INSTITUCION.map((t) => <option key={t} value={t}>{ETIQUETAS_TIPO_ID[t]}</option>)}
                    </Selector>
                  )}
                </Campo>
                <Campo etiqueta="Número de identificación" error={errores.identificacion}>
                  {(p) => <Entrada {...p} value={institucion.identificacion} className="font-mono" onChange={(e) => setInstitucion({ ...institucion, identificacion: e.target.value })} />}
                </Campo>
                <Campo
                  etiqueta="Correo institucional"
                  error={errores.correo}
                  ayuda={corrigiendo ? "Es el usuario de la cuenta." : "Será el usuario de la cuenta. No se aceptan correos personales."}
                >
                  {(p) => <Entrada {...p} type="email" value={institucion.correo} disabled={corrigiendo} autoComplete="email" onChange={(e) => setInstitucion({ ...institucion, correo: e.target.value })} />}
                </Campo>
                <Campo etiqueta="Sitio web" error={errores.sitioWeb}>
                  {(p) => <Entrada {...p} type="url" inputMode="url" placeholder="https://www.institucion.ac.cr" value={institucion.sitioWeb} onChange={(e) => setInstitucion({ ...institucion, sitioWeb: e.target.value })} />}
                </Campo>
              </div>
            </>
          )}

          {paso === "representante" && (
            <>
              <Encabezado titulo="Representante de la institución">
                La persona que responde por la institución ante la entidad que autoriza. Sus datos no se publican.
              </Encabezado>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre completo" error={errores.nombre} className="sm:col-span-2">
                  {(p) => <Entrada {...p} value={representante.nombre} autoComplete="name" onChange={(e) => setRepresentante({ ...representante, nombre: e.target.value })} />}
                </Campo>
                <Campo etiqueta="Tipo de identificación">
                  {(p) => (
                    <Selector {...p} value={representante.tipoIdentificacion} onChange={(e) => setRepresentante({ ...representante, tipoIdentificacion: e.target.value as DatosRepresentante["tipoIdentificacion"] })}>
                      {TIPOS_ID_PERSONA.map((t) => <option key={t} value={t}>{ETIQUETAS_TIPO_ID[t]}</option>)}
                    </Selector>
                  )}
                </Campo>
                <Campo etiqueta="Número de identificación" error={errores.identificacion}>
                  {(p) => <Entrada {...p} value={representante.identificacion} className="font-mono" onChange={(e) => setRepresentante({ ...representante, identificacion: e.target.value })} />}
                </Campo>
                <Campo etiqueta="Cargo" error={errores.cargo}>
                  {(p) => <Entrada {...p} value={representante.cargo} autoComplete="organization-title" onChange={(e) => setRepresentante({ ...representante, cargo: e.target.value })} />}
                </Campo>
                <Campo etiqueta="Teléfono" error={errores.telefono}>
                  {(p) => <Entrada {...p} type="tel" value={representante.telefono} autoComplete="tel" onChange={(e) => setRepresentante({ ...representante, telefono: e.target.value })} />}
                </Campo>
                <Campo etiqueta="Correo" error={errores.correo} className="sm:col-span-2">
                  {(p) => <Entrada {...p} type="email" value={representante.correo} onChange={(e) => setRepresentante({ ...representante, correo: e.target.value })} />}
                </Campo>
              </div>
            </>
          )}

          {paso === "cuenta" && (
            <>
              <Encabezado titulo="Contraseña de la cuenta">
                Con el correo institucional y esta contraseña entrará al portal. Antes de seguir verificamos el correo.
              </Encabezado>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Usuario" className="sm:col-span-2" ayuda={correoVerificado ? "Correo verificado." : undefined}>
                  {(p) => <Entrada {...p} value={institucion.correo} readOnly className="bg-hundido" autoComplete="username" />}
                </Campo>
                <Campo etiqueta="Contraseña" error={errores.contrasena}>
                  {(p) => <Entrada {...p} type="password" autoComplete="new-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} />}
                </Campo>
                <Campo etiqueta="Repita la contraseña" error={errores.contrasena2}>
                  {(p) => <Entrada {...p} type="password" autoComplete="new-password" value={contrasena2} onChange={(e) => setContrasena2(e.target.value)} />}
                </Campo>
              </div>
              <ul className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-2" aria-label="Requisitos de la contraseña">
                {reglasContrasena(contrasena).map(({ regla, cumple }) => (
                  <li key={regla} className={cumple ? "text-sello" : "text-tinta-tenue"}>
                    {cumple ? "✓" : "○"} {regla}
                  </li>
                ))}
              </ul>
            </>
          )}

          {paso === "revision" && (
            <>
              <Encabezado titulo={corrigiendo ? "Revise y reenvíe la solicitud" : "Revise y envíe la solicitud"}>
                La entidad que autoriza revisa la solicitud. Le avisaremos por correo cuando haya una decisión.
              </Encabezado>
              <ListaDatos
                datos={[
                  { termino: "Institución", valor: institucion.nombre },
                  { termino: "Tipo", valor: ETIQUETAS_CATEGORIA[institucion.categoria] },
                  { termino: ETIQUETAS_TIPO_ID[institucion.tipoIdentificacion], valor: <span className="font-mono">{institucion.identificacion}</span> },
                  {
                    termino: "Correo institucional",
                    valor: (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {institucion.correo}
                        <span className="inline-flex items-center gap-1 rounded-full bg-sello-claro px-2 text-xs font-medium text-sello"><MailCheck className="size-3" aria-hidden />verificado</span>
                      </span>
                    ),
                  },
                  { termino: "Sitio web", valor: institucion.sitioWeb },
                  { termino: "Provincia", valor: institucion.provincia },
                  { termino: "Representante", valor: `${representante.nombre} · ${representante.cargo}` },
                  { termino: ETIQUETAS_TIPO_ID[representante.tipoIdentificacion], valor: <span className="font-mono">{representante.identificacion}</span> },
                  { termino: "Contacto", valor: `${representante.correo} · ${representante.telefono}` },
                ]}
              />
              <label className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-tec-azul)]" />
                <span>Declaro que los datos son correctos y que represento a la institución para emitir credenciales en su nombre.</span>
              </label>
              {errores.acepta && <p className="text-sm font-medium text-lacre">{errores.acepta}</p>}
            </>
          )}

          {progreso && <p role="status" className="text-sm text-tinta-suave">{progreso}</p>}
          {error && <Aviso tipo="error" titulo="No se pudo continuar">{error}</Aviso>}

          <div className="flex flex-wrap justify-between gap-3 border-t border-linea pt-5">
            {indice > 0 ? (
              <Boton type="button" variante="secundario" icono={<ArrowLeft className="size-4" aria-hidden />} onClick={() => ir(indice - 1)} disabled={ocupado}>
                Atrás
              </Boton>
            ) : corrigiendo ? (
              <span />
            ) : (
              <Link href="/" className="inline-flex h-10 items-center text-sm font-medium text-tec-azul underline underline-offset-2">
                Ya tengo cuenta
              </Link>
            )}
            <Boton type="submit" cargando={ocupado} disabled={paso === "revision" && !acepta}>
              {paso === "revision"
                ? corrigiendo
                  ? "Reenviar solicitud"
                  : "Enviar solicitud"
                : paso === "cuenta" && !correoVerificado
                  ? "Verificar correo"
                  : "Siguiente"}
              {paso !== "revision" && <ArrowRight className="size-4" aria-hidden />}
            </Boton>
          </div>
        </form>
      </div>

      {verificandoCorreo && (
        <DialogoCodigo
          correo={institucion.correo.trim().toLowerCase()}
          codigoDesarrollo={verificandoCorreo.codigoDesarrollo}
          alReenviar={pedirCodigo}
          alCerrar={() => setVerificandoCorreo(null)}
          alVerificar={(id) => {
            setVerificacion({ correo: institucion.correo.trim().toLowerCase(), id });
            setVerificandoCorreo(null);
            ir(indice + 1);
          }}
        />
      )}
    </div>
  );
}

function Encabezado({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-[1.375rem] font-bold text-tec-azul">{titulo}</h2>
      <p className="mt-1.5 text-tinta-suave">{children}</p>
    </div>
  );
}

function DialogoCodigo({
  correo,
  codigoDesarrollo,
  alReenviar,
  alCerrar,
  alVerificar,
}: {
  correo: string;
  codigoDesarrollo?: string;
  alReenviar: () => Promise<void>;
  alCerrar: () => void;
  alVerificar: (verificacionId: string) => void;
}) {
  const { api } = useSesion();
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verificar(evento: FormEvent) {
    evento.preventDefault();
    if (!/^\d{6}$/.test(codigo)) {
      setError("Escriba los 6 dígitos del código.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const { verificacionId } = await api.verificarCodigoCorreo(correo, codigo);
      alVerificar(verificacionId);
    } catch (e) {
      setError(mensajeError(e));
      setEnviando(false);
    }
  }

  return (
    <Dialogo
      abierto
      alCerrar={alCerrar}
      titulo="Verifique su correo"
      descripcion={`Enviamos un código de 6 dígitos a ${correo}. Vence en 10 minutos.`}
      acciones={
        <>
          <Boton type="button" variante="fantasma" onClick={() => void alReenviar()}>
            Enviar otro código
          </Boton>
          <Boton type="submit" form="form-codigo" cargando={enviando}>
            Verificar
          </Boton>
        </>
      }
    >
      <form id="form-codigo" noValidate onSubmit={(e) => void verificar(e)} className="flex flex-col gap-3">
        {codigoDesarrollo && (
          <Aviso
            tipo="info"
            titulo="Modo de prueba"
            accion={<Boton type="button" tamano="sm" variante="secundario" onClick={() => setCodigo(codigoDesarrollo)}>Rellenar</Boton>}
          >
            Todavía no se envían correos. El código es <b className="font-mono">{codigoDesarrollo}</b>.
          </Aviso>
        )}
        <Campo etiqueta="Código de verificación" error={error}>
          {(p) => (
            <Entrada
              {...p}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              className="h-12 text-center font-mono text-xl tracking-[0.5em]"
            />
          )}
        </Campo>
      </form>
    </Dialogo>
  );
}
