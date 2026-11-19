import type { Metadata } from "next";
import { DetalleCredencial } from "../../../components/detalle-credencial";
import { decodificarId } from "../../../lib/rutas";

export const metadata: Metadata = { title: "Credencial" };

export default async function PaginaCredencial({ params }: { params: Promise<{ vcId: string }> }) {
  const { vcId } = await params;
  return <DetalleCredencial vcId={decodificarId(vcId)} />;
}
