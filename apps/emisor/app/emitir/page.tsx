import { Cargando } from "@repo/ui";
import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaEmitir } from "../../components/vistas/emitir";

export const metadata: Metadata = { title: "Emitir credencial" };

export default function Pagina() {
  return (
    <Suspense fallback={<Cargando texto="Preparando el formulario" />}>
      <VistaEmitir />
    </Suspense>
  );
}
