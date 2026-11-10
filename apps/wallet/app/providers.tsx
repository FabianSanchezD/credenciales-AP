"use client";

import { CavosProvider } from "@cavos/kit/react";
import type { ReactNode } from "react";
import { cavosConfig, cavosModalConfig } from "../lib/cavos/config";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CavosProvider config={cavosConfig} modal={cavosModalConfig}>
      {children}
    </CavosProvider>
  );
}
