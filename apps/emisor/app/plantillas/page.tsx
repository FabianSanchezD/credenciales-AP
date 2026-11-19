import type { Metadata } from "next";
import { VistaPlantillas } from "../../components/vistas/plantillas";

export const metadata: Metadata = { title: "Plantillas" };

export default function Pagina() {
  return <VistaPlantillas />;
}
