import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { MarcoWallet } from "../components/marco-wallet";
import "./globals.css";
import { Providers } from "./providers";

const sans = Public_Sans({ subsets: ["latin"], variable: "--fuente-sans", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--fuente-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Digital Wallet | Credenciales AP", template: "%s | Digital Wallet" },
  description: "Guarda y comparte tus credenciales académicas.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <Providers>
          <MarcoWallet>{children}</MarcoWallet>
        </Providers>
      </body>
    </html>
  );
}
