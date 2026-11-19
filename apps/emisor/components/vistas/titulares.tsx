"use client";

import type { TitularInscrito } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Dialogo,
  EncabezadoPagina,
  Entrada,
  Identificador,
  Panel,
  Vacio,
  formatearFecha,
} from "@repo/ui";
import { UserPlus, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { mensajeError } from "../../lib/errores";
import { useConsulta } from "../../lib/use-consulta";
import { validarDid } from "../../lib/validacion";
import { useEmisor } from "../acceso";
import { EnlaceBoton, ErrorCarga } from "../comun";

function FormularioInscripcion({ alInscribir }: { alInscribir: (titular: TitularInscrito) => void }) {
  const { api } = useSesion();
  const emisor = useEmisor();
  const [did, setDid] = useState("");
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [inscrito, setInscrito] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const problema = validarDid(did);
    setErrorCampo(problema);
    setInscrito(null);
    if (problema) return;
    setEnviando(true);
    setError(null);
    try {
      const titular = await api.inscribirTitular(emisor.id, did.trim());
      alInscribir(titular);
      setInscrito(titular.did);
      setDid("");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Panel>
      <h2 className="text-lg font-semibold text-tinta">Inscribir titular</h2>
      <p className="mt-1.5 text-sm text-tinta-suave">
        Pide a la persona que abra su Digital Wallet y copie su DID desde la sección para compartirlo.
        El DID no contiene datos personales: solo identifica su wallet para recibir credenciales.
      </p>
      <form onSubmit={(e) => void enviar(e)} noValidate className="mt-5 flex flex-col gap-4">
        <Campo etiqueta="DID del titular" error={errorCampo}>
          {(props) => (
            <Entrada
              {...props}
              value={did}
              onChange={(e) => setDid(e.target.value)}
              placeholder="did:stellar:testnet:G..."
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              className="font-mono text-sm"
            />
          )}
        </Campo>
        {error && (
          <Aviso tipo="error" titulo="No se pudo inscribir">
            {error}
          </Aviso>
        )}
        {inscrito && (
          <Aviso tipo="exito" titulo="Titular inscrito">
            Ya puedes emitirle credenciales.
          </Aviso>
        )}
        <div>
          <Boton type="submit" cargando={enviando} icono={<UserPlus aria-hidden className="size-4" />}>
            Inscribir titular
          </Boton>
        </div>
      </form>
    </Panel>
  );
}

export function VistaTitulares() {
  const { api } = useSesion();
  const emisor = useEmisor();
  const consulta = useConsulta(() => api.listarTitulares(emisor.id), `titulares:${emisor.id}`);
  const [porQuitar, setPorQuitar] = useState<TitularInscrito | null>(null);
  const [quitando, setQuitando] = useState(false);
  const [errorQuitar, setErrorQuitar] = useState<string | null>(null);
  const titulares = [...(consulta.datos ?? [])].sort((a, b) => b.registradoEn.localeCompare(a.registradoEn));

  async function quitar() {
    if (!porQuitar) return;
    setQuitando(true);
    setErrorQuitar(null);
    try {
      await api.quitarTitular(emisor.id, porQuitar.id);
      consulta.mutar((lista) => lista?.filter((t) => t.id !== porQuitar.id));
      setPorQuitar(null);
    } catch (e) {
      setErrorQuitar(mensajeError(e));
    } finally {
      setQuitando(false);
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Titulares"
        descripcion="Las personas a quienes tu institución emite credenciales. Cada una se identifica con el DID de su Digital Wallet."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
        <FormularioInscripcion
          alInscribir={(titular) =>
            consulta.mutar((lista) => [titular, ...(lista ?? []).filter((t) => t.id !== titular.id)])
          }
        />
        <section aria-labelledby="titulo-inscritos" className="flex min-w-0 flex-col gap-4">
          <h2 id="titulo-inscritos" className="text-lg font-semibold text-tinta">
            Inscritos{consulta.datos ? ` (${titulares.length})` : ""}
          </h2>
          {consulta.error && <ErrorCarga mensaje={consulta.error} alReintentar={consulta.recargar} />}
          {consulta.cargando && !consulta.datos && <Cargando texto="Cargando titulares" />}
          {consulta.datos && titulares.length === 0 && (
            <Vacio icono={<Users aria-hidden />} titulo="Todavía no hay titulares inscritos">
              Inscribe a la primera persona con el DID de su Digital Wallet para poder emitirle una
              credencial.
            </Vacio>
          )}
          {titulares.length > 0 && (
            <ul className="divide-y divide-linea rounded-panel border border-linea bg-superficie">
              {titulares.map((titular) => (
                <li
                  key={titular.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="min-w-0">
                      <Identificador valor={titular.did} etiqueta="Copiar DID" />
                    </span>
                    <span className="text-sm text-tinta-tenue">Inscrito el {formatearFecha(titular.registradoEn)}</span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <EnlaceBoton
                      href={`/emitir?titular=${encodeURIComponent(titular.did)}`}
                      variante="secundario"
                      tamano="sm"
                    >
                      Emitir credencial
                    </EnlaceBoton>
                    <Boton
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => {
                        setErrorQuitar(null);
                        setPorQuitar(titular);
                      }}
                    >
                      Quitar
                    </Boton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <Dialogo
        abierto={porQuitar !== null}
        alCerrar={() => setPorQuitar(null)}
        titulo="¿Quitar a este titular?"
        descripcion="Dejará de aparecer en tu lista. Las credenciales que ya le emitiste siguen en su wallet y siguen siendo válidas."
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setPorQuitar(null)} disabled={quitando}>
              Cancelar
            </Boton>
            <Boton variante="peligro" onClick={() => void quitar()} cargando={quitando}>
              Quitar titular
            </Boton>
          </>
        }
      >
        {porQuitar && (
          <p className="break-all font-mono text-sm text-tinta-suave">{porQuitar.did}</p>
        )}
        {errorQuitar && (
          <Aviso tipo="error" titulo="No se pudo quitar">
            {errorQuitar}
          </Aviso>
        )}
      </Dialogo>
    </>
  );
}
