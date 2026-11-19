import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Acceso } from "../components/acceso";
import { Providers } from "./providers";

const sans = Public_Sans({ subsets: ["latin"], variable: "--fuente-sans", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--fuente-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Portal del emisor | Credenciales AP", template: "%s | Portal del emisor" },
  description: "Emite y revoca microcredenciales firmadas.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <Providers>
          <Acceso>{children}</Acceso>
        </Providers>
      </body>
    </html>
  );
}
