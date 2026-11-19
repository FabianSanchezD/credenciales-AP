import { useId } from "react";
import { cn } from "./cn";

export type EstadoSello = "valida" | "revocada" | "invalida" | "pendiente";

const COLOR: Record<EstadoSello, string> = {
  valida: "text-sello",
  revocada: "text-lacre",
  invalida: "text-lacre",
  pendiente: "text-ambar",
};

const LEYENDA: Record<EstadoSello, string> = {
  valida: "Credencial válida · anclada en Stellar · ",
  revocada: "Credencial revocada · retirada por el emisor · ",
  invalida: "No superó la verificación · credencial inválida · ",
  pendiente: "Emisión pendiente · falta la firma del emisor · ",
};

/** Largo del círculo de texto (radio 40): la leyenda se reparte en él completa. */
const LARGO_CIRCULO = 2 * Math.PI * 40 - 2;

/** Contorno ondulado del sello, como el de un lacre o un sello notarial. */
function contorno(radio: number, ondas: number, amplitud: number): string {
  const puntos: string[] = [];
  const total = ondas * 6;
  for (let i = 0; i <= total; i++) {
    const angulo = (i / total) * Math.PI * 2;
    const r = radio + Math.cos(angulo * ondas) * amplitud;
    puntos.push(`${(60 + r * Math.cos(angulo)).toFixed(2)},${(60 + r * Math.sin(angulo)).toFixed(2)}`);
  }
  return `M${puntos.join("L")}Z`;
}

const CONTORNO = contorno(55, 28, 2.4);

function Simbolo({ estado }: { estado: EstadoSello }) {
  const comun = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (estado === "valida") return <path d="M44 61 L55 72 L77 49" {...comun} />;
  if (estado === "pendiente")
    return (
      <g {...comun} strokeWidth={4.5}>
        <circle cx="60" cy="60" r="17" />
        <path d="M60 50 V61 L67 66" />
      </g>
    );
  return <path d="M48 48 L72 72 M72 48 L48 72" {...comun} />;
}

/**
 * El elemento distintivo del sistema: un sello que cambia de color y símbolo
 * según el estado de la credencial. `estampar` lo anima una sola vez, cuando
 * acaba de cambiar el resultado.
 */
export function Sello({
  estado,
  tamano = 120,
  estampar = false,
  className,
}: {
  estado: EstadoSello;
  tamano?: number;
  estampar?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const leyenda = LEYENDA[estado];
  return (
    <svg
      viewBox="0 0 120 120"
      width={tamano}
      height={tamano}
      aria-hidden
      className={cn(COLOR[estado], "shrink-0 -rotate-[8deg]", estampar && "animate-estampar", className)}
    >
      <defs>
        <path id={`circulo-${id}`} d="M60,60 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0" />
      </defs>
      <path d={CONTORNO} fill="currentColor" opacity="0.12" />
      <path d={CONTORNO} fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="47" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 2.5" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <text fill="currentColor" fontSize="7.2" fontWeight="700">
        <textPath
          href={`#circulo-${id}`}
          startOffset="0"
          textLength={LARGO_CIRCULO}
          lengthAdjust="spacing"
        >
          {leyenda}
        </textPath>
      </text>
      <Simbolo estado={estado} />
    </svg>
  );
}
