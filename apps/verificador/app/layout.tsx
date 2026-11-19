import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import { Marco } from "@repo/ui";
import type { ReactNode } from "react";
import "./globals.css";

const sans = Public_Sans({ subsets: ["latin"], variable: "--fuente-sans", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--fuente-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Verificador público | Credenciales AP", template: "%s | Verificador público" },
  description: "Comprueba que una credencial académica es auténtica, sin crear una cuenta.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <Marco app="Verificador público" ancho="angosto">
          {children}
        </Marco>
      </body>
    </html>
  );
}
