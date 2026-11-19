# ADR 0004: Modelo de credencial y divulgación selectiva

- Estado: aceptada (prueba de concepto)
- Fecha: 2026-11-18

## Decisión

La microcredencial sigue W3C VC 2.0 (Tabla 6). Para que el titular elija qué revelar (RF-04) se usa
el mismo mecanismo que SD-JWT, adaptado a JSON:

- Siempre visibles: emisor, nombre y descripción del logro, tipo de credencial y fechas.
- Seleccionables: resultados de aprendizaje, temas evaluados, contexto (horas, nivel, modalidad,
  tipo de aprendizaje) y calificación.
- Cada atributo seleccionable se convierte en una divulgación `[sal, nombre, valor]`. La credencial
  firmada solo contiene `credentialSubject._sd`, con el SHA-256 (base64url) del JSON canónico de
  cada divulgación.
- Al presentar, el titular envía la credencial firmada y solo las divulgaciones que eligió. El
  verificador comprueba que cada una tenga su hash en `_sd`.

La salvaguarda S1 se cumple en la emisión: la API rechaza una credencial si faltan los resultados de
aprendizaje o el contexto, aunque luego el titular decida no revelarlos.

## Verificación (sección 5.3)

1. **Firma**: la prueba corresponde a la cuenta del DID del emisor.
2. **Integridad**: el hash de la credencial coincide con el anclado y cada divulgación coincide con
   un hash de `_sd`.
3. **Estado**: no existe revocación anclada.
4. **Emisor autorizado**: el DID está en el registro de confianza y estaba autorizado al emitir.

El resultado es `valida`, `revocada` o `invalida`, con el detalle de qué comprobación falló.
