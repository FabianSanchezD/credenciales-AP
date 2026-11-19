import type { ContenidoPlantilla, FirmaMensaje } from "@repo/credenciales";
import type {
  CategoriaEmisor,
  ConfigPublica,
  CredencialEnBoveda,
  CuerpoVerificacion,
  Desafio,
  Emision,
  EmisionFirmada,
  EmisionPreparada,
  Emisor,
  EstadoEmisor,
  Plantilla,
  ResultadoVerificacion,
  ResumenGobernanza,
  RevocacionPreparada,
  Rol,
  Sesion,
  SesionSinToken,
  TitularInscrito,
} from "./tipos.js";

export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

function mensajeDeError(cuerpo: unknown, status: number): string {
  if (cuerpo && typeof cuerpo === "object" && "message" in cuerpo) {
    const { message } = cuerpo as { message: unknown };
    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string") return message;
  }
  if (status >= 500) return "El servidor no está disponible. Intenta de nuevo en un momento.";
  return `La solicitud falló (${status})`;
}

export interface OpcionesCliente {
  baseUrl: string;
  /** Devuelve el token de sesión vigente, si hay uno. */
  token?: () => string | null;
  fetch?: typeof fetch;
}

/** Cliente tipado de la API. Todos los métodos lanzan `ErrorApi` si falla. */
export class ClienteApi {
  private readonly baseUrl: string;
  private readonly token: () => string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(opciones: OpcionesCliente) {
    this.baseUrl = opciones.baseUrl.replace(/\/$/, "");
    this.token = opciones.token ?? (() => null);
    this.fetchImpl = opciones.fetch ?? ((...args) => globalThis.fetch(...args));
  }

  private async pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (cuerpo !== undefined) headers["Content-Type"] = "application/json";
    const token = this.token();
    if (token) headers.Authorization = `Bearer ${token}`;

    let respuesta: Response;
    try {
      respuesta = await this.fetchImpl(`${this.baseUrl}${ruta}`, {
        method: metodo,
        headers,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
    } catch {
      throw new ErrorApi(0, "No se pudo conectar con el servidor. Revisa tu conexión.");
    }
    if (respuesta.status === 204) return undefined as T;
    const texto = await respuesta.text();
    const datos: unknown = texto ? JSON.parse(texto) : undefined;
    if (!respuesta.ok) throw new ErrorApi(respuesta.status, mensajeDeError(datos, respuesta.status));
    return datos as T;
  }

  config() {
    return this.pedir<ConfigPublica>("GET", "/config");
  }

  // Autenticación
  crearDesafio(address: string, rol: Rol) {
    return this.pedir<Desafio>("POST", "/auth/desafios", { address, rol });
  }
  crearSesion(desafioId: string, firma: FirmaMensaje) {
    return this.pedir<Sesion>("POST", "/auth/sesiones", { desafioId, firma });
  }
  sesionActual() {
    return this.pedir<SesionSinToken>("GET", "/auth/sesion");
  }
  cerrarSesion() {
    return this.pedir<void>("DELETE", "/auth/sesion");
  }

  // Emisores y registro de confianza
  listarEmisores(estado?: EstadoEmisor) {
    return this.pedir<Emisor[]>("GET", `/emisores${estado ? `?estado=${estado}` : ""}`);
  }
  obtenerEmisor(id: string) {
    return this.pedir<Emisor>("GET", `/emisores/${id}`);
  }
  registrarEmisor(datos: { nombre: string; categoria: CategoriaEmisor; sitioWeb: string | null }) {
    return this.pedir<Emisor>("POST", "/emisores", datos);
  }
  actualizarEmisor(id: string, datos: { nombre?: string; sitioWeb?: string | null }) {
    return this.pedir<Emisor>("PATCH", `/emisores/${id}`, datos);
  }
  cambiarEstadoEmisor(id: string, estado: EstadoEmisor, motivo: string) {
    return this.pedir<Emisor>("POST", `/emisores/${id}/estado`, { estado, motivo });
  }

  // Titulares inscritos con un emisor
  listarTitulares(emisorId: string) {
    return this.pedir<TitularInscrito[]>("GET", `/emisores/${emisorId}/titulares`);
  }
  inscribirTitular(emisorId: string, did: string) {
    return this.pedir<TitularInscrito>("POST", `/emisores/${emisorId}/titulares`, { did });
  }
  quitarTitular(emisorId: string, titularId: string) {
    return this.pedir<void>("DELETE", `/emisores/${emisorId}/titulares/${titularId}`);
  }

  // Plantillas del emisor en sesión
  listarPlantillas() {
    return this.pedir<Plantilla[]>("GET", "/plantillas");
  }
  obtenerPlantilla(id: string) {
    return this.pedir<Plantilla>("GET", `/plantillas/${id}`);
  }
  crearPlantilla(contenido: ContenidoPlantilla) {
    return this.pedir<Plantilla>("POST", "/plantillas", contenido);
  }
  actualizarPlantilla(id: string, contenido: ContenidoPlantilla) {
    return this.pedir<Plantilla>("PUT", `/plantillas/${id}`, contenido);
  }
  archivarPlantilla(id: string) {
    return this.pedir<Plantilla>("POST", `/plantillas/${id}/archivar`);
  }

  // Emisión y revocación (emisor en sesión)
  listarEmisiones() {
    return this.pedir<Emision[]>("GET", "/emisiones");
  }
  obtenerEmision(id: string) {
    return this.pedir<Emision>("GET", `/emisiones/${id}`);
  }
  prepararEmision(datos: { plantillaId: string; titularDid: string; calificacion?: string }) {
    return this.pedir<EmisionPreparada>("POST", "/emisiones", datos);
  }
  firmarEmision(id: string, firma: FirmaMensaje) {
    return this.pedir<EmisionFirmada>("POST", `/emisiones/${id}/firma`, { firma });
  }
  enviarEmision(id: string, signedXdr: string) {
    return this.pedir<Emision>("POST", `/emisiones/${id}/envio`, { signedXdr });
  }
  prepararRevocacion(id: string, motivo: string) {
    return this.pedir<RevocacionPreparada>("POST", `/emisiones/${id}/revocacion`, { motivo });
  }
  enviarRevocacion(id: string, signedXdr: string) {
    return this.pedir<Emision>("POST", `/emisiones/${id}/revocacion/envio`, { signedXdr });
  }

  // Bóveda del titular en sesión
  listarBoveda() {
    return this.pedir<CredencialEnBoveda[]>("GET", "/boveda");
  }
  listarBloqueos() {
    return this.pedir<Emisor[]>("GET", "/boveda/bloqueos");
  }
  bloquearEmisor(emisorId: string) {
    return this.pedir<void>("PUT", `/boveda/bloqueos/${emisorId}`);
  }
  desbloquearEmisor(emisorId: string) {
    return this.pedir<void>("DELETE", `/boveda/bloqueos/${emisorId}`);
  }

  // Verificación pública: no requiere sesión y la API no guarda nada
  verificar(cuerpo: CuerpoVerificacion) {
    return this.pedir<ResultadoVerificacion>("POST", "/verificaciones", cuerpo);
  }

  // Consola de gobernanza
  resumenGobernanza() {
    return this.pedir<ResumenGobernanza>("GET", "/gobernanza/resumen");
  }
}
