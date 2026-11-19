"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ClienteApi, ErrorApi } from "./api.js";
import type { Firmante } from "./firmantes.js";
import type { Rol, Sesion } from "./tipos.js";

export type EstadoSesion = "cargando" | "sin_sesion" | "activa";

export interface ContextoSesion {
  api: ClienteApi;
  estado: EstadoSesion;
  sesion: Sesion | null;
  /** Firmante conectado en esta pestaña (puede faltar tras recargar la página). */
  firmante: Firmante | null;
  /** Firma un desafío con el firmante y abre sesión con el rol de la app. */
  iniciarSesion: (firmante: Firmante) => Promise<Sesion>;
  /** Entra con correo y contraseña (cuentas de emisor). */
  iniciarConContrasena: (correo: string, contrasena: string) => Promise<Sesion>;
  /** Adopta una sesión que la API ya abrió (p. ej. al crear la cuenta). */
  adoptarSesion: (sesion: Sesion, firmante?: Firmante | null) => void;
  /** Vuelve a asociar un firmante sin pedir otra firma (p. ej. tras recargar). */
  establecerFirmante: (firmante: Firmante | null) => void;
  /** Vuelve a leer la sesión (p. ej. tras registrar el emisor). */
  refrescar: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const Contexto = createContext<ContextoSesion | null>(null);

function leer(clave: string): Sesion | null {
  try {
    const texto = window.localStorage.getItem(clave);
    if (!texto) return null;
    const sesion = JSON.parse(texto) as Sesion;
    return new Date(sesion.expiraEn) > new Date() ? sesion : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, sesion: Sesion | null): void {
  try {
    if (sesion) window.localStorage.setItem(clave, JSON.stringify(sesion));
    else window.localStorage.removeItem(clave);
  } catch {
    // Sin almacenamiento la sesión dura lo que dure la pestaña.
  }
}

export function SesionProvider({
  apiUrl,
  rol,
  children,
}: {
  apiUrl: string;
  rol: Rol;
  children: ReactNode;
}) {
  const clave = `credenciales-ap:sesion:${rol}`;
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [estado, setEstado] = useState<EstadoSesion>("cargando");
  const [firmante, setFirmante] = useState<Firmante | null>(null);
  const tokenRef = useRef<string | null>(null);

  const api = useMemo(
    () => new ClienteApi({ baseUrl: apiUrl, token: () => tokenRef.current }),
    [apiUrl],
  );

  const guardar = useCallback(
    (nueva: Sesion | null) => {
      tokenRef.current = nueva?.token ?? null;
      escribir(clave, nueva);
      setSesion(nueva);
      setEstado(nueva ? "activa" : "sin_sesion");
    },
    [clave],
  );

  const refrescar = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const actual = await api.sesionActual();
      const token = tokenRef.current;
      if (token) guardar({ ...actual, token });
    } catch (error) {
      if (error instanceof ErrorApi && error.status === 401) guardar(null);
      else throw error;
    }
  }, [api, guardar]);

  useEffect(() => {
    const guardada = leer(clave);
    tokenRef.current = guardada?.token ?? null;
    if (!guardada) {
      setEstado("sin_sesion");
      return;
    }
    setSesion(guardada);
    setEstado("activa");
    refrescar().catch(() => undefined);
  }, [clave, refrescar]);

  const iniciarSesion = useCallback(
    async (nuevo: Firmante) => {
      const desafio = await api.crearDesafio(nuevo.address, rol);
      const firma = await nuevo.firmarMensaje(desafio.mensaje);
      const creada = await api.crearSesion(desafio.desafioId, firma);
      setFirmante(nuevo);
      guardar(creada);
      return creada;
    },
    [api, guardar, rol],
  );

  const iniciarConContrasena = useCallback(
    async (correo: string, contrasena: string) => {
      const creada = await api.ingresarConCorreo(correo, contrasena);
      guardar(creada);
      return creada;
    },
    [api, guardar],
  );

  const adoptarSesion = useCallback(
    (nueva: Sesion, nuevoFirmante: Firmante | null = null) => {
      setFirmante(nuevoFirmante);
      guardar(nueva);
    },
    [guardar],
  );

  const cerrarSesion = useCallback(async () => {
    try {
      if (tokenRef.current) await api.cerrarSesion();
    } catch {
      // La sesión se cierra localmente aunque la API no responda.
    }
    await firmante?.desconectar?.().catch(() => undefined);
    setFirmante(null);
    guardar(null);
  }, [api, firmante, guardar]);

  const valor = useMemo<ContextoSesion>(
    () => ({
      api,
      estado,
      sesion,
      firmante,
      iniciarSesion,
      iniciarConContrasena,
      adoptarSesion,
      establecerFirmante: setFirmante,
      refrescar,
      cerrarSesion,
    }),
    [api, estado, sesion, firmante, iniciarSesion, iniciarConContrasena, adoptarSesion, refrescar, cerrarSesion],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return contexto;
}
