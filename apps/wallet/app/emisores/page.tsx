import type { Metadata } from "next";
import { Instituciones } from "../../components/instituciones";

export const metadata: Metadata = { title: "Instituciones" };

export default function PaginaInstituciones() {
  return <Instituciones />;
}
