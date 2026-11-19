"use client";

import { SesionProvider } from "@repo/cliente/react";
import type { ReactNode } from "react";
import { env } from "../lib/env";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SesionProvider apiUrl={env.apiUrl} rol="gobernanza">
      {children}
    </SesionProvider>
  );
}
