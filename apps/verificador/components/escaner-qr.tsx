"use client";

import { Aviso, Boton } from "@repo/ui";
import { ScanLine, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { abrirVerificacion, extraerCodigo } from "../lib/codigo";

/** API del navegador para leer códigos de barras. Aún no está en los tipos de TypeScript. */
interface DetectorDeCodigos {
  detect(fuente: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}
interface ConstructorDetector {
  new (opciones: { formats: string[] }): DetectorDeCodigos;
  getSupportedFormats?: () => Promise<string[]>;
}

function obtenerConstructor(): ConstructorDetector | null {
  const global = window as unknown as { BarcodeDetector?: ConstructorDetector };
  return global.BarcodeDetector ?? null;
}

function sinSuscripcion() {
  return () => {};
}

/** Solo se sabe en el navegador; en el servidor se asume que no hay soporte. */
function useEscanerDisponible(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => obtenerConstructor() !== null && typeof navigator.mediaDevices?.getUserMedia === "function",
    () => false,
  );
}

function mensajeDeCamara(error: unknown): string {
  const nombre = error instanceof DOMException ? error.name : "";
  if (nombre === "NotAllowedError" || nombre === "SecurityError")
    return "No diste permiso para usar la cámara. Puedes permitirlo en la configuración del navegador o pegar el enlace arriba.";
  if (nombre === "NotFoundError" || nombre === "OverconstrainedError")
    return "No encontramos una cámara en este dispositivo. Pega el enlace arriba.";
  if (nombre === "NotReadableError")
    return "Otra aplicación está usando la cámara. Ciérrala e intenta de nuevo.";
  return "No pudimos abrir la cámara. Pega el enlace arriba.";
}

export function EscanerQR() {
  const disponible = useEscanerDisponible();
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!disponible) {
    return (
      <p className="text-sm text-tinta-tenue">
        Si tienes el código QR, ábrelo con la cámara de tu teléfono y esta página mostrará el resultado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 border-t border-linea pt-5">
      {activo ? (
        <VistaCamara
          alCerrar={() => setActivo(false)}
          alFallar={(mensaje) => {
            setActivo(false);
            setError(mensaje);
          }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <Boton
            variante="secundario"
            tamano="lg"
            icono={<ScanLine aria-hidden className="size-5" />}
            onClick={() => {
              setError(null);
              setActivo(true);
            }}
            className="sm:self-start"
          >
            Escanear código QR
          </Boton>
          <p className="text-sm text-tinta-tenue">Usa la cámara de este dispositivo. No guardamos ninguna imagen.</p>
        </div>
      )}
      {error && <Aviso tipo="advertencia" titulo="No se pudo escanear">{error}</Aviso>}
    </div>
  );
}

function VistaCamara({ alCerrar, alFallar }: { alCerrar: () => void; alFallar: (mensaje: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const fallar = useEffectEvent((mensaje: string) => alFallar(mensaje));
  const leerValor = useEffectEvent((valor: string): boolean => {
    const codigo = extraerCodigo(valor);
    if (!codigo) {
      setAviso("Este código QR no es de una credencial. Apunta al código que te mostró la persona titular.");
      return false;
    }
    abrirVerificacion(codigo);
    return true;
  });

  useEffect(() => {
    let cancelado = false;
    let flujo: MediaStream | null = null;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    const detener = () => {
      clearTimeout(temporizador);
      flujo?.getTracks().forEach((pista) => pista.stop());
      flujo = null;
    };

    void (async () => {
      const Detector = obtenerConstructor();
      if (!Detector) return fallar("Tu navegador no puede leer códigos QR. Pega el enlace arriba.");
      try {
        const formatos = (await Detector.getSupportedFormats?.()) ?? ["qr_code"];
        if (!formatos.includes("qr_code")) {
          return fallar("Tu navegador no puede leer códigos QR. Pega el enlace arriba.");
        }
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelado || !video.current) return detener();
        video.current.srcObject = flujo;
        await video.current.play();
      } catch (error) {
        detener();
        if (!cancelado) fallar(mensajeDeCamara(error));
        return;
      }

      const detector = new Detector({ formats: ["qr_code"] });
      const revisar = async () => {
        if (cancelado || !video.current) return;
        try {
          const codigos = await detector.detect(video.current);
          const valor = codigos[0]?.rawValue;
          if (!cancelado && valor && leerValor(valor)) {
            detener();
            return;
          }
        } catch {
          // Un cuadro ilegible no es un error: se intenta con el siguiente.
        }
        if (!cancelado) temporizador = setTimeout(revisar, 250);
      };
      void revisar();
    })();

    return () => {
      cancelado = true;
      detener();
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-panel border border-linea bg-hundido">
        <video
          ref={video}
          muted
          playsInline
          aria-label="Vista de la cámara para leer el código QR"
          className="aspect-square w-full object-cover sm:aspect-video"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto size-3/5 max-h-64 max-w-64 rounded-documento border-2 border-superficie/90"
        />
      </div>
      <p role="status" className="text-sm text-tinta-suave">
        {aviso ?? "Apunta la cámara al código QR. La verificación empieza sola al leerlo."}
      </p>
      <Boton variante="fantasma" icono={<X aria-hidden className="size-4" />} onClick={alCerrar} className="self-start">
        Detener cámara
      </Boton>
    </div>
  );
}
