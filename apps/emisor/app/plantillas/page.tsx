import { Cargando } from "@repo/ui";
import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaPlantillas } from "../../components/vistas/plantillas";

export const metadata: Metadata = { title: "Plantillas" };

export default function Pagina() {
  return (
    <Suspense fallback={<Cargando texto="Cargando plantillas" />}>
      <VistaPlantillas />
    </Suspense>
  );
}
