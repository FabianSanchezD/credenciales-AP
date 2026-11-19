import { Cargando } from "@repo/ui";
import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaEmisores } from "../../componentes/vista-emisores";

export const metadata: Metadata = { title: "Instituciones" };

export default function PaginaEmisores() {
  return (
    <Suspense fallback={<Cargando texto="Cargando instituciones" />}>
      <VistaEmisores />
    </Suspense>
  );
}
