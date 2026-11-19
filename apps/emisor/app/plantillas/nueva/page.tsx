import { Cargando } from "@repo/ui";
import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaPlantillaNueva } from "../../../components/vistas/plantilla-nueva";

export const metadata: Metadata = { title: "Nueva plantilla" };

export default function Pagina() {
  return (
    <Suspense fallback={<Cargando texto="Preparando el formulario" />}>
      <VistaPlantillaNueva />
    </Suspense>
  );
}
