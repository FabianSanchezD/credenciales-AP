"use client";

import { CavosProvider } from "@cavos/kit/react";
import { SesionProvider } from "@repo/cliente/react";
import type { ReactNode } from "react";
import { TitularProvider } from "../components/titular";
import { cavosConfig, cavosModalConfig } from "../lib/cavos/config";
import { env } from "../lib/env";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CavosProvider config={cavosConfig} modal={cavosModalConfig}>
      <SesionProvider apiUrl={env.apiUrl} rol="titular">
        <TitularProvider>{children}</TitularProvider>
      </SesionProvider>
    </CavosProvider>
  );
}
