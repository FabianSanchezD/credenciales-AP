"use client";

import { ETIQUETAS_CATEGORIA, type Emisor } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { Aviso, Boton, Identificador, Insignia, ListaDatos, Panel, formatearFechaHora } from "@repo/ui";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { mensajeError } from "../lib/errores";

function DatosEnviados({ emisor }: { emisor: Emisor }) {
  return (
    <ListaDatos
      datos={[
        { termino: "Institución", valor: emisor.nombre },
        { termino: "Categoría", valor: ETIQUETAS_CATEGORIA[emisor.categoria] },
        { termino: "Sitio web", valor: emisor.sitioWeb ?? "No indicado" },
        { termino: "DID", valor: <Identificador valor={emisor.did} etiqueta="Copiar DID" /> },
        { termino: "Solicitud enviada", valor: formatearFechaHora(emisor.creadoEn) },
      ]}
    />
  );
}

function BotonRevisar() {
  const { refrescar } = useSesion();
  const [revisando, setRevisando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Boton
          variante="secundario"
          icono={<RefreshCw aria-hidden className="size-4" />}
          cargando={revisando}
          onClick={() => {
            setRevisando(true);
            setError(null);
            refrescar()
              .catch((e: unknown) => setError(mensajeError(e)))
              .finally(() => setRevisando(false));
          }}
        >
          Revisar el estado
        </Boton>
      </div>
      {error && <Aviso tipo="error" titulo="No se pudo revisar el estado">{error}</Aviso>}
    </div>
  );
}

export function EmisorPendiente({ emisor }: { emisor: Emisor }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-2 sm:py-6">
      <div className="flex flex-col items-start gap-3">
        <Insignia tono="ambar">Pendiente de autorización</Insignia>
        <h1 className="text-[1.75rem] font-bold leading-tight text-tinta">Tu solicitud está en revisión</h1>
        <p className="text-tinta-suave">
          Para proteger a estudiantes y empleadores, solo las instituciones autorizadas por la entidad
          que autoriza pueden emitir credenciales. Cuando aprueben la solicitud, este portal se
          habilitará con la misma cuenta. No necesitas hacer nada más por ahora.
        </p>
      </div>
      <Panel>
        <h2 className="mb-4 text-lg font-semibold text-tinta">Datos enviados</h2>
        <DatosEnviados emisor={emisor} />
      </Panel>
      <BotonRevisar />
    </div>
  );
}

export function EmisorSuspendido({ emisor }: { emisor: Emisor }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-2 sm:py-6">
      <div className="flex flex-col items-start gap-3">
        <Insignia tono="lacre">Suspendida</Insignia>
        <h1 className="text-[1.75rem] font-bold leading-tight text-tinta">La institución está suspendida</h1>
        <p className="text-tinta-suave">
          Mientras dure la suspensión no puedes emitir ni revocar credenciales. Las credenciales que ya
          emitiste siguen en las wallets de sus titulares, pero la verificación indicará que la
          institución no está autorizada.
        </p>
      </div>
      <Aviso tipo="error" titulo="Motivo de la suspensión">
        <p>{emisor.motivoEstado ?? "La entidad que autoriza no indicó un motivo."}</p>
        {emisor.suspendidoEn && <p className="mt-1">Desde el {formatearFechaHora(emisor.suspendidoEn)}.</p>}
      </Aviso>
      <p className="text-tinta-suave">
        Para resolverlo, comunícate con la entidad que autoriza e indica el DID de tu institución.
      </p>
      <Panel>
        <DatosEnviados emisor={emisor} />
      </Panel>
      <BotonRevisar />
    </div>
  );
}
