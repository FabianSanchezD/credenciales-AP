import type { Metadata } from "next";
import { Cuenta } from "../../components/cuenta";

export const metadata: Metadata = { title: "Cuenta" };

export default function PaginaCuenta() {
  return <Cuenta />;
}
