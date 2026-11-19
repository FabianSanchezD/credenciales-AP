import type { Metadata } from "next";
import { CompartirCredencial } from "../../../../components/compartir-credencial";
import { decodificarId } from "../../../../lib/rutas";

export const metadata: Metadata = { title: "Compartir credencial" };

export default async function PaginaCompartir({ params }: { params: Promise<{ vcId: string }> }) {
  const { vcId } = await params;
  return <CompartirCredencial vcId={decodificarId(vcId)} />;
}
