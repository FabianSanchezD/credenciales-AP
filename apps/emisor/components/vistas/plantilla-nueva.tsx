"use client";

import { useSesion } from "@repo/cliente/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConsulta } from "../../lib/use-consulta";
import { useEmisor } from "../acceso";
import { EnlaceTexto } from "../comun";
import { FormularioPlantilla } from "../formulario-plantilla";

export function VistaPlantillaNueva() {
  const { api } = useSesion();
  const emisor = useEmisor();
  const router = useRouter();
  const carpetaInicial = useSearchParams().get("carpeta");
  const carpetas = useConsulta(() => api.listarCarpetas(), "carpetas");
  return (
    <div className="flex flex-col gap-5">
      <div className="text-[13px] text-tinta-suave">
        <EnlaceTexto href="/plantillas">Plantillas</EnlaceTexto> › Nueva plantilla
      </div>
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-tec-azul">Nueva plantilla</h1>
        <p className="mt-1.5 max-w-[62ch] text-tinta-suave">
          Defina una sola vez qué certifica y úsela en todas las credenciales que emita para ese logro.
        </p>
      </div>
      <FormularioPlantilla
        textoGuardar="Guardar plantilla"
        emisorNombre={emisor.nombre}
        carpetas={carpetas.datos ?? []}
        carpetaInicial={carpetaInicial}
        alCancelar={() => router.push("/plantillas")}
        alGuardar={async (contenido, organizacion) => {
          const creada = await api.crearPlantilla(contenido);
          if (organizacion.carpeta || organizacion.etiquetas.length) {
            await api.organizarPlantilla(creada.id, organizacion);
          }
          router.push(`/plantillas?creada=${creada.id}`);
        }}
      />
    </div>
  );
}
