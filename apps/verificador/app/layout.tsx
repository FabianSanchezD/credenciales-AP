import type { Metadata } from "next";
import { Roboto, Roboto_Mono, Tinos } from "next/font/google";
import { Marco } from "@repo/ui";
import type { ReactNode } from "react";
import "./globals.css";

const sans = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--fuente-sans", display: "swap" });
const mono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--fuente-mono", display: "swap" });
const marca = Tinos({ subsets: ["latin"], weight: "400", variable: "--fuente-marca", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Verificador público | Credenciales AP", template: "%s | Verificador público" },
  description: "Comprueba que una credencial académica es auténtica, sin crear una cuenta.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} ${marca.variable}`}>
      <body>
        <Marco app="Verificador público" ancho="angosto">
          {children}
        </Marco>
      </body>
    </html>
  );
}
