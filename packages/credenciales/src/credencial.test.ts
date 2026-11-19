import { toDidStellar } from "@repo/stellar";
import { Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { canonicalizar } from "./canonico.js";
import { aBase64, bytesAFirmar } from "./index.js";
import {
  adjuntarPrueba,
  construirCredencial,
  divulgacionesValidas,
  hashCredencial,
  mensajeDeFirma,
  verificarPrueba,
} from "./credencial.js";
import { estadoStellar, claveAnclaje } from "./anclaje.js";
import { firmarSep53ConSemilla, verificarFirmaMensaje } from "./firmas.js";
import {
  codificarPresentacion,
  crearPresentacion,
  decodificarPresentacion,
} from "./presentacion.js";
import { atributosRevelados } from "./divulgacion.js";
import type { CredencialFirmada } from "./modelo.js";

const emisor = Keypair.random();
const titular = Keypair.random();
const vcId = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";

function credencialFirmada() {
  const { credencial, divulgaciones } = construirCredencial({
    vcId,
    emisor: { did: toDidStellar(emisor.publicKey(), "testnet"), nombre: "Emisor demo" },
    titularDid: toDidStellar(titular.publicKey(), "testnet"),
    logro: {
      nombre: "Fundamentos de credenciales verificables",
      descripcion: "Curso corto sobre VC 2.0",
    },
    atributos: {
      resultadosAprendizaje: ["Diseña un flujo de emisión y verificación"],
      temasEvaluados: ["VC 2.0", "DID"],
      contexto: { horas: 40, nivel: "intermedio", modalidad: "virtual", tipoAprendizaje: "no_formal" },
      calificacion: "95/100",
    },
    emitidaEn: new Date("2026-10-20T00:00:00Z"),
    vigenciaMeses: null,
    estado: estadoStellar("testnet", emisor.publicKey(), vcId),
  });
  const firma = firmarSep53ConSemilla(emisor.secret(), mensajeDeFirma(credencial));
  return { credencial: adjuntarPrueba(credencial, firma), divulgaciones };
}

describe("canonicalizar", () => {
  it("ordena claves y omite undefined", () => {
    expect(canonicalizar({ b: 1, a: [true, null], c: undefined, "é": "x" })).toBe(
      '{"a":[true,null],"b":1,"é":"x"}',
    );
  });
});

describe("firmas", () => {
  it("verifica SEP-53 y rechaza otro mensaje", () => {
    const firma = firmarSep53ConSemilla(emisor.secret(), "hola");
    expect(verificarFirmaMensaje("hola", firma)).toBe(true);
    expect(verificarFirmaMensaje("adiós", firma)).toBe(false);
  });

  it("verifica el esquema de Cavos", () => {
    const firma = emisor.sign(Buffer.from(bytesAFirmar("cavos", "desafío")));
    expect(
      verificarFirmaMensaje("desafío", {
        esquema: "cavos",
        publicKey: emisor.publicKey(),
        firma: aBase64(new Uint8Array(firma)),
      }),
    ).toBe(true);
  });
});

describe("credencial", () => {
  it("no guarda los atributos seleccionables en claro", () => {
    const { credencial } = credencialFirmada();
    const texto = JSON.stringify(credencial);
    expect(texto).not.toContain("95/100");
    expect(texto).not.toContain("Diseña un flujo");
    expect(credencial.credentialSubject._sd).toHaveLength(4);
  });

  it("la prueba es válida y el hash es estable", () => {
    const { credencial } = credencialFirmada();
    expect(verificarPrueba(credencial)).toBe(true);
    expect(hashCredencial(credencial)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCredencial(structuredClone(credencial))).toBe(hashCredencial(credencial));
  });

  it("una credencial alterada no supera la verificación (RNF-03)", () => {
    const { credencial } = credencialFirmada();
    const alterada: CredencialFirmada = structuredClone(credencial);
    alterada.credentialSubject.logro.nombre = "Doctorado en todo";
    expect(verificarPrueba(alterada)).toBe(false);
    expect(hashCredencial(alterada)).not.toBe(hashCredencial(credencial));
  });

  it("rechaza una prueba firmada por otra cuenta", () => {
    const { credencial } = credencialFirmada();
    const otra = Keypair.random();
    const firma = firmarSep53ConSemilla(otra.secret(), mensajeDeFirma(credencial));
    expect(verificarPrueba(adjuntarPrueba(credencial, firma))).toBe(false);
  });

  it("usa claves manageData dentro del límite de Stellar", () => {
    expect(claveAnclaje(vcId).length).toBeLessThanOrEqual(64);
  });
});

describe("divulgación selectiva", () => {
  it("revela solo lo elegido y detecta valores cambiados", async () => {
    const { credencial, divulgaciones } = credencialFirmada();
    const presentacion = crearPresentacion(credencial, divulgaciones, ["contexto"]);
    expect(presentacion.divulgaciones).toHaveLength(1);
    expect(divulgacionesValidas(credencial, presentacion.divulgaciones)).toBe(true);
    expect(atributosRevelados(presentacion.divulgaciones)).toEqual({
      contexto: { horas: 40, nivel: "intermedio", modalidad: "virtual", tipoAprendizaje: "no_formal" },
    });

    const falsa = structuredClone(presentacion.divulgaciones);
    falsa[0]![2] = { horas: 400, nivel: "avanzado", modalidad: "virtual", tipoAprendizaje: "formal" };
    expect(divulgacionesValidas(credencial, falsa)).toBe(false);

    const codigo = await codificarPresentacion(presentacion);
    expect(codigo).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodificarPresentacion(codigo)).toEqual(presentacion);
  });

  it("falla con un código dañado", async () => {
    await expect(decodificarPresentacion("no-es-valido")).rejects.toThrow();
  });
});
