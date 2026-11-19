import type { Metadata } from "next";
import { VistaEmisionDetalle } from "../../../components/vistas/emision-detalle";

export const metadata: Metadata = { title: "Emisión" };

export default function Pagina() {
  return <VistaEmisionDetalle />;
}
