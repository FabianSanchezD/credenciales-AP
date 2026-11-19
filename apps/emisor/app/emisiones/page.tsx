import type { Metadata } from "next";
import { VistaEmisiones } from "../../components/vistas/emisiones";

export const metadata: Metadata = { title: "Emisiones" };

export default function Pagina() {
  return <VistaEmisiones />;
}
