# ADR 0001: Anclaje de credenciales y adaptador ACTA

- Estado: aceptada (prueba de concepto)
- Fecha: 2026-11-18
- Relacionado: Entregable 2, secciones 4.2, 5.2, 5.4 y 6

## Contexto

El Entregable 2 define que el hash y el estado de cada credencial se anclan en Stellar mediante
ACTA (`vc-vault-factory` y `vc-vault`). Al revisar el SDK oficial (`@acta-team/credentials` 1.1.10):

- Toda llamada a la API de ACTA exige una API key (`X-ACTA-Key`). La key se obtiene en
  dapp.acta.build conectando una wallet de Stellar, es decir, la debe crear una persona del equipo.
- `vcIssue` guarda el contenido completo de la credencial (`vcData`) en la bóveda del titular y
  cobra 5 XLM en testnet o 1 USDC en mainnet al emisor.
- `revokeCredentialViaApi` recibe `owner` (dueño de la bóveda) y un `sourcePublicKey` opcional. La
  documentación indica que firma el dueño de la bóveda, que en nuestro diseño es el titular. Esa es
  la decisión abierta #1 del entregable y no se puede confirmar sin una API key.

## Decisión

1. El backend define un puerto `AnclajeDriver` (preparar emisión, enviar transacción firmada,
   preparar revocación, consultar estado). El resto del sistema solo conoce ese puerto: es el
   "adaptador ACTA" de la sección 4.2.
2. Se implementan dos drivers, elegidos con `ANCLAJE_DRIVER`:
   - `stellar` (por defecto): ancla en la cuenta del emisor con operaciones `manageData`.
     - `c:<vcId>` guarda el SHA-256 (32 bytes) de la credencial firmada.
     - `r:<vcId>` guarda la fecha de revocación (segundos Unix).
     Cualquier persona puede verificar leyendo Horizon, sin depender de la API ni del emisor
     (RNF-07). Solo el emisor puede escribir en su cuenta, así que solo el emisor puede revocar.
   - `acta`: usa `ActaClient` (`vcIssue`, `vaultVerify`, `vaultGetVcDirect`,
     `revokeCredentialViaApi`). Se activa con `ACTA_API_KEY`.
3. La credencial lleva en `credentialStatus` el tipo de anclaje y dónde consultarlo, de modo que el
   verificador sabe qué driver usar para cada credencial.

## Consecuencias

- La prueba de concepto corre hoy en testnet sin cuentas externas.
- El emisor paga la comisión de red y 0.5 XLM de reserva por cada entrada de datos (testnet).
- Para cerrar la decisión abierta #1 con ACTA: crear la API key, poner `ANCLAJE_DRIVER=acta` y
  ejecutar la prueba de revocación descrita en `docs/acta-spike.md`. Si ACTA solo permite revocar
  al dueño de la bóveda, se mantiene el driver `stellar` para el estado de revocación.
