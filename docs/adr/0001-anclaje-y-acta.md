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

## Resultado de la prueba en vivo con ACTA (2026-11-18)

Se creó una API key de testnet en dapp.acta.build y se probó `ANCLAJE_DRIVER=acta` desde el portal
del emisor. La emisión no llegó a completarse, por dos requisitos de ACTA que el driver actual no
cubre:

1. **Una API key por emisor.** ACTA responde `403` ("The issuer must be the wallet address
   associated with your API key") si el emisor no es la wallet que creó la key. Con una sola
   `ACTA_API_KEY` en la API, la plataforma solo podría tener una institución emisora; para varias
   haría falta guardar una key por institución.
2. **DID del emisor en el registro de ACTA.** Con la wallet correcta, ACTA responde "issuer did is
   required". El SDK 1.1.10 exige un `issuerDid` con forma `did:stellar:<red>:<26 caracteres a-z2-7>`,
   registrado on-chain en el registro de DIDs de ACTA. No acepta el `did:stellar:<red>:G...` de la
   plataforma (ADR 0002). Ese DID tiene su propia llave ("issuer identity") que debe persistir: en el
   navegador el SDK la guarda en IndexedDB; en un servidor exige un almacenamiento explícito.

Además, el flujo del SDK crea la bóveda ACTA del titular (`createVault`) antes de emitir, cosa que
el driver tampoco hace. La pregunta de la decisión abierta #1 (si el emisor puede revocar) quedó sin
probar porque la emisión no llegó a ese punto.

**Decisión:** la prueba de concepto se queda con el driver `stellar`. Integrar ACTA requiere:

- registrar, una sola vez y desde el navegador del emisor, su `did:stellar` de ACTA (la llave no
  pasa por la API, RNF-02) y guardar el `issuerDid` junto al emisor;
- una API key de ACTA por institución, o un acuerdo con ACTA para una key de plataforma;
- crear la bóveda ACTA del titular, firmada con su wallet de Cavos o patrocinada;
- repetir la prueba de revocación de `docs/acta-spike.md`.
