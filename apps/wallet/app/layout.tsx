import type { Metadata } from "next";
import { Roboto, Roboto_Mono, Tinos } from "next/font/google";
import type { ReactNode } from "react";
import { MarcoWallet } from "../components/marco-wallet";
import "./globals.css";
import { Providers } from "./providers";

const sans = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--fuente-sans", display: "swap" });
const mono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--fuente-mono", display: "swap" });
const marca = Tinos({ subsets: ["latin"], weight: "400", variable: "--fuente-marca", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Digital Wallet | Credenciales AP", template: "%s | Digital Wallet" },
  description: "Guarda y comparte tus credenciales académicas.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} ${marca.variable}`}>
      <body>
        <Providers>
          <MarcoWallet>{children}</MarcoWallet>
        </Providers>
      </body>
    </html>
  );
}
