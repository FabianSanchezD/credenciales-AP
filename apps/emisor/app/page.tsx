import type { Metadata } from "next";
import { VistaInicio } from "../components/vistas/inicio";

export const metadata: Metadata = { title: { absolute: "Portal del emisor | Credenciales Verificables" } };

export default function Pagina() {
  return <VistaInicio />;
}
