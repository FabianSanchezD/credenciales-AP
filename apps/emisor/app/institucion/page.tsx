import type { Metadata } from "next";
import { VistaInstitucion } from "../../components/vistas/institucion";

export const metadata: Metadata = { title: "Institución" };

export default function Pagina() {
  return <VistaInstitucion />;
}
