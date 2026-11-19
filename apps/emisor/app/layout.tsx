import type { Metadata } from "next";
import { Roboto, Roboto_Mono, Tinos } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Acceso } from "../components/acceso";
import { Providers } from "./providers";

const sans = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--fuente-sans", display: "swap" });
const mono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--fuente-mono", display: "swap" });
const marca = Tinos({ subsets: ["latin"], weight: "400", variable: "--fuente-marca", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Portal del emisor | Credenciales AP", template: "%s | Portal del emisor" },
  description: "Emite y revoca microcredenciales firmadas.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} ${marca.variable}`}>
      <body>
        <Providers>
          <Acceso>{children}</Acceso>
        </Providers>
      </body>
    </html>
  );
}
