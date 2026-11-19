"use client";

import { useSesion } from "@repo/cliente/react";
import { EncabezadoPagina } from "@repo/ui";
import { useRouter } from "next/navigation";
import { EnlaceTexto } from "../comun";
import { FormularioPlantilla } from "../formulario-plantilla";

export function VistaPlantillaNueva() {
  const { api } = useSesion();
  const router = useRouter();
  return (
    <>
      <p className="mb-3 text-sm">
        <EnlaceTexto href="/plantillas">Volver a plantillas</EnlaceTexto>
      </p>
      <EncabezadoPagina
        titulo="Nueva plantilla"
        descripcion="Define una sola vez el contenido de un curso y úsalo en todas las credenciales que emitas para él."
      />
      <FormularioPlantilla
        textoGuardar="Guardar plantilla"
        alCancelar={() => router.push("/plantillas")}
        alGuardar={async (contenido) => {
          const creada = await api.crearPlantilla(contenido);
          router.push(`/plantillas/${creada.id}`);
        }}
      />
    </>
  );
}
