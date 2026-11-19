import type { Metadata } from "next";
import { InicioTitular } from "../components/inicio-titular";

export const metadata: Metadata = { title: "Tus credenciales" };

export default function Inicio() {
  return <InicioTitular />;
}
