import type { Metadata } from "next";
import { Roboto, Roboto_Mono, Tinos } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Consola } from "../componentes/consola";
import { Providers } from "./providers";

const sans = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--fuente-sans", display: "swap" });
const mono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--fuente-mono", display: "swap" });
const marca = Tinos({ subsets: ["latin"], weight: "400", variable: "--fuente-marca", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Consola de gobernanza | Credenciales AP", template: "%s | Consola de gobernanza" },
  description: "Autoriza a las instituciones que pueden emitir.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} ${marca.variable}`}>
      <body>
        <Providers>
          <Consola>{children}</Consola>
        </Providers>
      </body>
    </html>
  );
}
