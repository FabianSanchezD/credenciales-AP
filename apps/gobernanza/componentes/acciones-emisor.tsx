"use client";

import type { Emisor, EstadoEmisor } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { AreaTexto, Aviso, Boton, Campo, Dialogo } from "@repo/ui";
import { MessageSquareWarning, ShieldCheck, ShieldOff, ShieldX } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AvisoError } from "./aviso-error";

const MINIMO_MOTIVO = 3;

type Decision = Extract<EstadoEmisor, "autorizado" | "suspendido" | "correcciones" | "rechazado">;

/** Textos de cada decisión: botón, diálogo y ejemplo de motivo. */
const DECISIONES: Record<
  Decision,
  { etiqueta: string; titulo: string; descripcion: string; ejemplo: string; peligro: boolean }
> = {
  autorizado: {
    etiqueta: "Autorizar institución",
    titulo: "Autorizar a",
    descripcion:
      "Desde este momento la institución podrá emitir credenciales a sus titulares con sus propias plantillas.",
    ejemplo: "Por ejemplo: acreditación vigente verificada en la sesión del consejo.",
    peligro: false,
  },
  correcciones: {
    etiqueta: "Pedir correcciones",
    titulo: "Pedir correcciones a",
    descripcion:
      "La institución verá el motivo, podrá corregir sus datos y reenviar la solicitud. Mientras tanto no puede emitir.",
    ejemplo: "Por ejemplo: el correo debe ser del dominio institucional y falta la personería jurídica.",
    peligro: false,
  },
  rechazado: {
    etiqueta: "Rechazar",
    titulo: "Rechazar a",
    descripcion: "La solicitud queda rechazada y la institución no podrá emitir credenciales con esta cuenta.",
    ejemplo: "Por ejemplo: la institución no está acreditada para otorgar estos títulos.",
    peligro: true,
  },
  suspendido: {
    etiqueta: "Suspender institución",
    titulo: "Suspender a",
    descripcion:
      "La institución no podrá emitir credenciales nuevas. Las credenciales que emitió antes de la suspensión siguen siendo válidas y verificables.",
    ejemplo: "Por ejemplo: acreditación vencida, en revisión por el consejo.",
    peligro: true,
  },
};

/** Texto que anuncia el resultado de una decisión. */
export function anunciarDecision(emisor: Emisor): string {
  switch (emisor.estado) {
    case "autorizado":
      return `${emisor.nombre} quedó autorizada. Desde ahora puede emitir credenciales.`;
    case "correcciones":
      return `Se pidieron correcciones a ${emisor.nombre}. La solicitud volverá a pendientes cuando la reenvíe.`;
    case "rechazado":
      return `La solicitud de ${emisor.nombre} quedó rechazada.`;
    default:
      return `${emisor.nombre} quedó suspendida. No puede emitir credenciales nuevas; las ya emitidas siguen siendo válidas.`;
  }
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
        {emisor.estado === "pendiente" && (
          <>
            <Boton
              tamano={tamano}
              variante="secundario"
              icono={<MessageSquareWarning aria-hidden className="size-4" />}
              onClick={() => setDecision("correcciones")}
            >
              Pedir correcciones
            </Boton>
            <Boton
              tamano={tamano}
              variante="secundario"
              icono={<ShieldX aria-hidden className="size-4" />}
              onClick={() => setDecision("rechazado")}
            >
              Rechazar
            </Boton>
          </>
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

  const textos = DECISIONES[decision];
  const etiqueta = textos.etiqueta;

  return (
    <Dialogo
      abierto
      alCerrar={alCerrar}
      titulo={`${textos.titulo} ${emisor.nombre}`}
      descripcion={textos.descripcion}
      acciones={
        <>
          <Boton variante="fantasma" onClick={alCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton
            type="submit"
            form={formulario}
            variante={textos.peligro ? "peligro" : "primario"}
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
              placeholder={textos.ejemplo}
            />
          )}
        </Campo>
        {error !== null && <AvisoError error={error} titulo="No se pudo registrar la decisión" />}
      </form>
    </Dialogo>
  );
}
