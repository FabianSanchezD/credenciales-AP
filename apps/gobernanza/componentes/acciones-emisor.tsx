"use client";

import type { Emisor, EstadoEmisor } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { AreaTexto, Aviso, Boton, Campo, Dialogo } from "@repo/ui";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AvisoError } from "./aviso-error";

const MINIMO_MOTIVO = 3;

type Decision = Extract<EstadoEmisor, "autorizado" | "suspendido">;

/** Texto que anuncia el resultado de una decisión. */
export function anunciarDecision(emisor: Emisor): string {
  return emisor.estado === "autorizado"
    ? `${emisor.nombre} quedó autorizada. Desde ahora puede emitir credenciales.`
    : `${emisor.nombre} quedó suspendida. No puede emitir credenciales nuevas; las ya emitidas siguen siendo válidas.`;
}

/**
 * Botones para autorizar o suspender una institución. Cada decisión pasa por
 * un diálogo que explica la consecuencia y exige un motivo escrito.
 */
export function AccionesEmisor({
  emisor,
  alCambiar,
  tamano = "md",
}: {
  emisor: Emisor;
  alCambiar: (actualizado: Emisor) => void;
  tamano?: "sm" | "md";
}) {
  const [decision, setDecision] = useState<Decision | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(emisor.estado === "pendiente" || emisor.estado === "suspendido") && (
          <Boton
            tamano={tamano}
            icono={<ShieldCheck aria-hidden className="size-4" />}
            onClick={() => setDecision("autorizado")}
          >
            Autorizar institución
          </Boton>
        )}
        {emisor.estado === "autorizado" && (
          <Boton
            tamano={tamano}
            variante="secundario"
            icono={<ShieldOff aria-hidden className="size-4" />}
            onClick={() => setDecision("suspendido")}
          >
            Suspender institución
          </Boton>
        )}
      </div>
      {decision && (
        <DialogoDecision
          emisor={emisor}
          decision={decision}
          alCerrar={() => setDecision(null)}
          alCambiar={(actualizado) => {
            setDecision(null);
            alCambiar(actualizado);
          }}
        />
      )}
    </>
  );
}

function DialogoDecision({
  emisor,
  decision,
  alCerrar,
  alCambiar,
}: {
  emisor: Emisor;
  decision: Decision;
  alCerrar: () => void;
  alCambiar: (actualizado: Emisor) => void;
}) {
  const { api } = useSesion();
  const [motivo, setMotivo] = useState("");
  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const autorizar = decision === "autorizado";
  const motivoLimpio = motivo.trim();
  const errorMotivo =
    intentado && motivoLimpio.length < MINIMO_MOTIVO
      ? `Escribe el motivo de la decisión (mínimo ${MINIMO_MOTIVO} caracteres).`
      : null;
  const formulario = `decision-${emisor.id}`;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setIntentado(true);
    if (motivoLimpio.length < MINIMO_MOTIVO) return;
    setEnviando(true);
    setError(null);
    try {
      const actualizado = await api.cambiarEstadoEmisor(emisor.id, decision, motivoLimpio);
      alCambiar(actualizado);
    } catch (e) {
      setError(e);
      setEnviando(false);
    }
  }

  const etiqueta = autorizar ? "Autorizar institución" : "Suspender institución";

  return (
    <Dialogo
      abierto
      alCerrar={alCerrar}
      titulo={autorizar ? `Autorizar a ${emisor.nombre}` : `Suspender a ${emisor.nombre}`}
      descripcion={
        autorizar
          ? "Desde este momento la institución podrá emitir credenciales a sus titulares con sus propias plantillas."
          : "La institución no podrá emitir credenciales nuevas. Las credenciales que emitió antes de la suspensión siguen siendo válidas y verificables."
      }
      acciones={
        <>
          <Boton variante="fantasma" onClick={alCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton
            type="submit"
            form={formulario}
            variante={autorizar ? "primario" : "peligro"}
            cargando={enviando}
          >
            {etiqueta}
          </Boton>
        </>
      }
    >
      <form id={formulario} noValidate onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4">
        {emisor.estado === "suspendido" && autorizar && (
          <Aviso tipo="info">
            La institución está suspendida. Al autorizarla de nuevo recupera la posibilidad de emitir.
          </Aviso>
        )}
        <Campo
          etiqueta="Motivo de la decisión"
          ayuda="Queda registrado junto a la decisión y la institución puede consultarlo."
          error={errorMotivo}
        >
          {(props) => (
            <AreaTexto
              {...props}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              minLength={MINIMO_MOTIVO}
              maxLength={500}
              disabled={enviando}
              placeholder={
                autorizar
                  ? "Por ejemplo: acreditación vigente verificada en la sesión del consejo."
                  : "Por ejemplo: acreditación vencida, en revisión por el consejo."
              }
            />
          )}
        </Campo>
        {error !== null && <AvisoError error={error} titulo="No se pudo registrar la decisión" />}
      </form>
    </Dialogo>
  );
}
