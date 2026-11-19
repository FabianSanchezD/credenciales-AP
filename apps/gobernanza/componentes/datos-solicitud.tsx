"use client";

import { ErrorApi, ETIQUETAS_TIPO_ID } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Cargando, formatearFechaHora, ListaDatos, Panel } from "@repo/ui";
import { useCallback } from "react";
import { useDatos } from "../lib/use-datos";
import { AvisoError } from "./aviso-error";

/**
 * Datos que la institución dio al crear su cuenta: identificación, contacto y
 * representante. No son públicos; solo los ven ella y la entidad que autoriza.
 */
export function DatosSolicitud({ emisorId }: { emisorId: string }) {
  const { api } = useSesion();
  const cargar = useCallback(() => api.obtenerRegistroEmisor(emisorId), [api, emisorId]);
  const { datos: registro, error, recargar } = useDatos(cargar);

  if (!registro) {
    // Instituciones registradas con wallet antes de las cuentas con correo.
    if (error instanceof ErrorApi && error.status === 404) return null;
    return (
      <Panel>
        {error !== null ? <AvisoError error={error} alReintentar={recargar} /> : <Cargando texto="Cargando la solicitud" />}
      </Panel>
    );
  }

  const { institucion, representante } = registro;
  return (
    <Panel className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-tinta">Datos de la solicitud</h2>
        <p className="mt-1 text-sm text-tinta-suave">Privados: solo los ven la institución y la entidad que autoriza.</p>
      </div>
      <ListaDatos
        datos={[
          {
            termino: ETIQUETAS_TIPO_ID[institucion.tipoIdentificacion],
            valor: <span className="font-mono">{institucion.identificacion}</span>,
          },
          { termino: "Correo institucional", valor: institucion.correo },
          { termino: "Correo verificado", valor: formatearFechaHora(registro.correoVerificadoEn) },
          { termino: "Provincia", valor: institucion.provincia },
          { termino: "Representante", valor: representante.nombre },
          { termino: "Cargo", valor: representante.cargo },
          {
            termino: ETIQUETAS_TIPO_ID[representante.tipoIdentificacion],
            valor: <span className="font-mono">{representante.identificacion}</span>,
          },
          { termino: "Correo del representante", valor: representante.correo },
          { termino: "Teléfono", valor: representante.telefono },
          { termino: "Última actualización", valor: formatearFechaHora(registro.actualizadoEn) },
        ]}
      />
    </Panel>
  );
}
