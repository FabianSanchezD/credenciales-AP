import type { Metadata } from "next";
import { VistaInstitucion } from "../../components/vistas/institucion";

export const metadata: Metadata = { title: "Configuración" };

export default function Pagina() {
  return <VistaInstitucion />;
}
