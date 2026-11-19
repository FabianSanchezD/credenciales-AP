# ADR 0002: Identidad, firmas y sesiones

- Estado: aceptada (prueba de concepto)
- Fecha: 2026-11-18

## Contexto

Cada participante se identifica con `did:stellar:<red>:<cuenta G...>` (paquete `@repo/stellar`).
Una cuenta `G...` es una llave pública Ed25519, así que el propio DID sirve para verificar firmas
sin un registro adicional. Las llaves privadas nunca pasan por la API (RNF-02).

Hay tres formas de firmar mensajes:

| Esquema | Quién lo usa | Bytes firmados |
| --- | --- | --- |
| `sep53` | Emisor y gobernanza con Freighter u otra wallet de Stellar | `SHA-256("Stellar Signed Message:\n" + mensaje)` |
| `cavos` | Titular con su Digital Wallet de Cavos | `"Cavos Signed Message:\n" + largo + "\n" + mensaje` |

Cavos firma con una llave de control (`controlAddress`) que es firmante de la cuenta del titular.

## Decisión

- **Inicio de sesión por desafío**: la API entrega un mensaje con nonce y vencimiento; el cliente lo
  firma y recibe un token de sesión (Bearer) con rol `emisor`, `titular` o `gobernanza`.
- **Titular con Cavos**: la firma es válida si la llave coincide con la cuenta, o si es firmante de
  la cuenta según Horizon. Si la cuenta aún no existe on-chain (Cavos la crea de forma diferida) se
  acepta la llave de control, y se documenta como limitación de la prueba de concepto.
- **Gobernanza**: las cuentas autorizadas se listan en `GOBERNANZA_CUENTAS`. En desarrollo,
  `GOBERNANZA_ABIERTA=true` permite que cualquier firmante entre a la consola.
- **Prueba de la credencial**: `DataIntegrityProof` con `cryptosuite: "stellar-sep53-jcs-2026"`.
  El emisor firma el JSON canónico (JCS, RFC 8785) de la credencial sin `proof`.
- **Sin cuentas demo** (2026-11-18): se quitó el modo demo que generaba en el navegador una cuenta
  de testnet con su semilla en `localStorage`. El titular entra solo con Cavos, y el emisor y la
  gobernanza solo con una wallet de Stellar. Las semillas locales quedan para las pruebas y el smoke.
- Desafíos y sesiones viven en un almacén temporal: Redis si hay `REDIS_URL`, memoria si no.
