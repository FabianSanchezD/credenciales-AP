import type { Metadata } from "next";
import { VistaTitular } from "../../../components/vistas/titular-detalle";

export const metadata: Metadata = { title: "Titular" };

export default function Pagina() {
  return <VistaTitular />;
}
