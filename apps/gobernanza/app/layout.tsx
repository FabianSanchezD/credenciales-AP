import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Consola } from "../componentes/consola";
import { Providers } from "./providers";

const sans = Public_Sans({ subsets: ["latin"], variable: "--fuente-sans", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--fuente-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Consola de gobernanza | Credenciales AP", template: "%s | Consola de gobernanza" },
  description: "Autoriza a las instituciones que pueden emitir.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <Providers>
          <Consola>{children}</Consola>
        </Providers>
      </body>
    </html>
  );
}
