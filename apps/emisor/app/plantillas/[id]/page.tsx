import type { Metadata } from "next";
import { VistaPlantillaDetalle } from "../../../components/vistas/plantilla-detalle";

export const metadata: Metadata = { title: "Plantilla" };

export default function Pagina() {
  return <VistaPlantillaDetalle />;
}
