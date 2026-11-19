"use client";

import { BotonCopiar, CodigoQR, Panel } from "@repo/ui";

/**
 * El DID del titular, para compartirlo con la institución que le va a emitir
 * (paso 2 del flujo de emisión). No incluye ningún otro dato personal.
 */
export function PanelIdentificador({ did }: { did: string }) {
  return (
    <Panel className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-tinta">Tu identificador</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Compártelo con tu institución para que pueda emitirte credenciales. Es lo único que
            necesita: no incluye tu nombre, tu correo ni otros datos personales.
          </p>
        </div>
        <code className="block break-all rounded-control bg-hundido px-3 py-2 font-mono text-[0.8125rem] leading-relaxed text-tinta">
          {did}
        </code>
        <div>
          <BotonCopiar
            valor={did}
            etiqueta="Copiar identificador"
            className="border border-linea-fuerte bg-superficie text-tinta"
          />
        </div>
      </div>
      <figure className="flex shrink-0 flex-col items-start gap-2 sm:items-center">
        <CodigoQR valor={did} tamano={152} />
        <figcaption className="text-xs text-tinta-tenue">
          La institución puede escanearlo
        </figcaption>
      </figure>
    </Panel>
  );
}
