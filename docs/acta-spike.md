# Prueba pendiente con ACTA (decisión abierta #1)

El driver `acta` está implementado pero no se ha probado en vivo, porque la API de ACTA exige una
API key que solo puede crear una persona del equipo.

## Pasos

1. Entrar a https://dapp.acta.build, conectar una wallet de Stellar en testnet y crear una API key.
2. En `apps/api/.env`:
   ```
   ANCLAJE_DRIVER=acta
   ACTA_API_KEY=<la key de testnet>
   ```
3. Levantar la API y emitir una credencial desde el portal del emisor (testnet cobra 5 XLM).
4. Revocarla desde el portal.

## Qué observar

- **Emisión**: la transacción preparada por `vcIssue` la firma la cuenta del emisor y la bóveda
  queda a nombre del titular.
- **Revocación**: si `revokeCredentialViaApi` con `sourcePublicKey` del emisor se acepta, el emisor
  puede revocar y la decisión #1 queda cerrada a favor de ACTA. Si ACTA exige la firma del dueño de
  la bóveda (el titular), se mantiene el driver `stellar` para el estado de revocación, tal como
  describe el ADR 0001.
- **Verificación**: `vaultVerify` debe devolver `revoked` después del paso 4 y el verificador debe
  mostrar "Credencial revocada".

Anotar el resultado en `docs/adr/0001-anclaje-y-acta.md`.
