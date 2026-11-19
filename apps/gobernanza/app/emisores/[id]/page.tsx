import type { Metadata } from "next";
import { VistaDetalle } from "../../../componentes/vista-detalle";

export const metadata: Metadata = { title: "Institución" };

export default async function PaginaEmisor({ params }: PageProps<"/emisores/[id]">) {
  const { id } = await params;
  return <VistaDetalle id={id} />;
}
