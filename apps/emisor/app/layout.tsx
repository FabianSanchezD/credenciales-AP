import type { Metadata } from "next";
import { Roboto, Roboto_Mono, Tinos } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Acceso } from "../components/acceso";
import { Providers } from "./providers";

// Identidad TEC: Roboto para todo el texto; Tinos solo para la marca.
const sans = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--fuente-sans", display: "swap" });
const serif = Roboto({ subsets: ["latin"], weight: ["500", "700"], variable: "--fuente-serif", display: "swap" });
const mono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--fuente-mono", display: "swap" });
const marca = Tinos({ subsets: ["latin"], weight: ["400"], variable: "--fuente-marca", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Portal del emisor | Credenciales Verificables", template: "%s | Portal del emisor" },
  description: "Emite y revoca credenciales verificables firmadas.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable} ${mono.variable} ${marca.variable}`}>
      <body>
        <Providers>
          <Acceso>{children}</Acceso>
        </Providers>
      </body>
    </html>
  );
}
