"use client";

import { SesionProvider } from "@repo/cliente/react";
import type { ReactNode } from "react";
import { env } from "../lib/env";
import { ProveedorFirma } from "../lib/firma-contrasena";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SesionProvider apiUrl={env.apiUrl} rol="emisor">
      <ProveedorFirma>{children}</ProveedorFirma>
    </SesionProvider>
  );
}
