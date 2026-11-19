import type { Metadata } from "next";
import { VistaTitulares } from "../../components/vistas/titulares";

export const metadata: Metadata = { title: "Titulares" };

export default function Pagina() {
  return <VistaTitulares />;
}
