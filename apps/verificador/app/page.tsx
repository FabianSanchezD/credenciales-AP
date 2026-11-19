import { Panel } from "@repo/ui";
import { FormularioCodigo } from "../components/formulario-codigo";

const PASOS = [
  {
    titulo: "Recibes un enlace o un código QR",
    texto:
      "La persona titular te lo comparte desde su billetera de credenciales. Ella decide qué datos de su logro quiere mostrarte.",
  },
  {
    titulo: "Comprobamos la credencial",
    texto:
      "Revisamos la firma de la institución, que nadie haya cambiado el contenido y que no haya sido revocada, consultando el registro público en Stellar.",
  },
  {
    titulo: "Ves el resultado en segundos",
    texto:
      "Te mostramos si la credencial es válida, fue revocada o no es válida, junto con el nombre de la institución que la emitió.",
  },
];

export default function Inicio() {
  return (
    <div className="flex flex-col gap-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold text-tinta sm:text-[1.75rem]">Verifica una credencial</h1>
        <p className="mt-2 text-tinta-suave">
          Comprueba en segundos que un logro académico es auténtico, quién lo emitió y si sigue vigente.
        </p>
      </header>

      <Panel>
        <FormularioCodigo />
      </Panel>

      <section aria-labelledby="como-funciona" className="flex flex-col gap-5">
        <h2 id="como-funciona" className="text-lg font-semibold text-tinta">
          Cómo funciona la verificación
        </h2>
        <ol className="flex flex-col gap-5">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="flex gap-4">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full border border-linea-fuerte bg-superficie text-sm font-semibold text-tinta cifras"
              >
                {i + 1}
              </span>
              <div className="min-w-0 pt-1">
                <p className="font-semibold text-tinta">{paso.titulo}</p>
                <p className="mt-1 text-tinta-suave">{paso.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="rounded-panel bg-hundido px-4 py-3 text-sm text-tinta-suave">
          No necesitas crear una cuenta ni pagar nada. Esta página no guarda la credencial ni tus datos.
        </p>
      </section>
    </div>
  );
}
