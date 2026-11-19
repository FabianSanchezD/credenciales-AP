"use client";

import { AreaTexto, Boton, Campo } from "@repo/ui";
import { ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { abrirVerificacion, extraerCodigo } from "../lib/codigo";
import { EscanerQR } from "./escaner-qr";

export function FormularioCodigo() {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!texto.trim()) {
      setError("Pega el enlace o el código que te compartieron.");
      return;
    }
    const codigo = extraerCodigo(texto);
    if (!codigo) {
      setError(
        "No reconocemos este enlace. Asegúrate de copiarlo completo, incluida la parte que va después del signo #.",
      );
      return;
    }
    setError(null);
    setAbriendo(true);
    abrirVerificacion(codigo);
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Campo
          etiqueta="Enlace o código de la credencial"
          ayuda="Es el enlace que te envió la persona titular. Lo puedes pegar completo."
          error={error}
        >
          {(props) => (
            <AreaTexto
              {...props}
              name="codigo"
              rows={3}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                if (error) setError(null);
              }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Pega aquí el enlace"
              className="min-h-20 break-all font-mono text-sm"
            />
          )}
        </Campo>
        <Boton type="submit" tamano="lg" cargando={abriendo} icono={<ShieldCheck aria-hidden className="size-5" />} className="sm:self-start">
          Verificar credencial
        </Boton>
      </form>
      <EscanerQR />
    </div>
  );
}
