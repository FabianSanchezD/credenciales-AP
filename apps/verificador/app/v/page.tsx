import type { Metadata } from "next";
import { Verificacion } from "../../components/verificacion";

export const metadata: Metadata = {
  title: "Resultado de la verificación",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PaginaVerificacion() {
  return <Verificacion />;
}
