import type { Metadata } from "next";
import { VistaPlantillaNueva } from "../../../components/vistas/plantilla-nueva";

export const metadata: Metadata = { title: "Nueva plantilla" };

export default function Pagina() {
  return <VistaPlantillaNueva />;
}
