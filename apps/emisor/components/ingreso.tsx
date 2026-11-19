"use client";

import { crearFirmanteConSemilla, descifrarSemilla } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Boton, Campo, Entrada } from "@repo/ui";
import { BadgeCheck, Fingerprint, PenLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { mensajeError } from "../lib/errores";
import { validarCorreo } from "../lib/validacion";
import { ArteCredencial } from "./arte-credencial";

const VENTAJAS = [
  { icono: PenLine, titulo: "Firma digital", texto: "Cada credencial lleva la firma de su institución." },
  { icono: Fingerprint, titulo: "Huella inalterable", texto: "Anclada en Stellar, una red pública." },
  { icono: ShieldCheck, titulo: "Divulgación selectiva", texto: "El titular decide qué datos mostrar." },
  { icono: BadgeCheck, titulo: "Emisores validados", texto: "Solo instituciones autorizadas emiten." },
];

/** Entrada al portal con el correo institucional y la contraseña. */
export function Ingreso() {
  const { api, iniciarConContrasena, establecerFirmante } = useSesion();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errores, setErrores] = useState<{ correo?: string; contrasena?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar(evento: FormEvent) {
    evento.preventDefault();
    const nuevos = {
      correo: validarCorreo(correo) ?? undefined,
      contrasena: contrasena ? undefined : "Escriba la contraseña.",
    };
    setErrores(nuevos);
    if (nuevos.correo || nuevos.contrasena) return;
    setEnviando(true);
    setError(null);
    try {
      await iniciarConContrasena(correo.trim().toLowerCase(), contrasena);
      // Abre la llave de firma con la misma contraseña para no pedirla al emitir.
      try {
        const { llaveCifrada } = await api.miLlave();
        establecerFirmante(crearFirmanteConSemilla(await descifrarSemilla(llaveCifrada, contrasena)));
      } catch {
        // Instituciones con wallet propia: firman conectándola al emitir.
      }
    } catch (e) {
      setError(mensajeError(e));
      setEnviando(false);
    }
  }

  return (
    <div className="grid overflow-hidden rounded-xl border border-linea bg-superficie shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,20,50,0.06)] lg:grid-cols-[1.05fr_1fr]">
      <section className="relative flex flex-col gap-6 overflow-hidden border-b border-linea bg-hundido p-6 sm:p-10 lg:border-b-0 lg:border-r">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(var(--color-linea)_1px,transparent_1px)] [background-size:14px_14px]"
        />
        <div className="relative flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-lacre">Instituciones emisoras</span>
          <h1 className="text-[1.75rem] font-bold leading-tight text-tec-azul">Credenciales con respaldo verificable</h1>
          <p className="max-w-[46ch] text-tinta-suave">
            Emita títulos y certificados firmados por su institución, con una huella pública que cualquiera puede
            comprobar en segundos.
          </p>
        </div>
        <div className="relative">
          <ArteCredencial />
        </div>
        <ul className="relative grid gap-x-5 gap-y-4 sm:grid-cols-2">
          {VENTAJAS.map(({ icono: Icono, titulo, texto }, i) => (
            <li key={titulo} className="grid grid-cols-[2.125rem_1fr] items-start gap-2.5 text-sm text-tinta-suave">
              <span
                className={`grid size-[2.125rem] place-items-center rounded-lg border border-linea bg-superficie ${i === 1 ? "text-lacre" : "text-tec-azul"}`}
              >
                <Icono aria-hidden className="size-4" />
              </span>
              <span>
                <b className="block font-medium text-tinta">{titulo}</b>
                {texto}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-5 p-6 sm:p-10">
        <div>
          <h2 className="text-2xl font-bold text-tec-azul">Iniciar sesión</h2>
          <p className="mt-1.5 text-tinta-suave">Ingrese con el correo institucional de su cuenta.</p>
        </div>
        <form noValidate onSubmit={(e) => void entrar(e)} className="flex flex-col gap-4">
          <Campo etiqueta="Correo institucional" error={errores.correo}>
            {(props) => (
              <Entrada
                {...props}
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="nombre@institucion.ac.cr"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="h-11"
              />
            )}
          </Campo>
          <Campo etiqueta="Contraseña" error={errores.contrasena}>
            {(props) => (
              <Entrada
                {...props}
                type="password"
                autoComplete="current-password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                className="h-11"
              />
            )}
          </Campo>
          {error && (
            <Aviso tipo="error" titulo="No se pudo iniciar sesión">
              {error}
            </Aviso>
          )}
          <Boton type="submit" tamano="lg" anchoCompleto cargando={enviando}>
            Iniciar sesión
          </Boton>
        </form>
        <p className="text-sm text-tinta-tenue">
          ¿Olvidó su contraseña? Por ahora, escriba a la entidad que autoriza para restablecerla.
        </p>
        <div className="mt-auto border-t border-linea pt-5 text-sm text-tinta-suave">
          ¿Su institución aún no tiene cuenta?{" "}
          <Link href="/registro" className="font-medium text-tec-azul underline underline-offset-2">
            Crear cuenta
          </Link>
        </div>
      </section>
    </div>
  );
}
