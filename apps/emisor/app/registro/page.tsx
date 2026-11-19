import { redirect } from "next/navigation";

/**
 * Sin sesión, `Acceso` muestra aquí el asistente para crear la cuenta. Con
 * una institución autorizada en sesión no hay nada que registrar.
 */
export default function Pagina() {
  redirect("/");
}
