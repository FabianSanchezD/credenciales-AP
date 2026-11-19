# Credenciales AP

Plataforma de microcredenciales académicas verificables sobre Stellar. Prueba de concepto del
Entregable 2 para Don Rufino: una credencial se **emite, guarda, presenta, verifica y revoca** de
punta a punta en testnet, y una credencial alterada no supera la verificación.

## Piezas

| Carpeta | Qué es | Puerto |
| --- | --- | --- |
| `apps/wallet` | Digital Wallet del titular (Cavos, passkey o correo) | 3000 |
| `apps/emisor` | Portal del emisor: plantillas, emisión y revocación | 3001 |
| `apps/verificador` | Verificador público, sin cuenta | 3002 |
| `apps/gobernanza` | Consola de la entidad que autoriza a los emisores | 3003 |
| `apps/api` | API NestJS: registro de confianza, emisión, verificación, bóveda | 4000 |
| `packages/credenciales` | Modelo W3C VC 2.0, firmas, divulgación selectiva, presentaciones | |
| `packages/cliente` | Contrato HTTP tipado, firmantes (wallet de Stellar, demo) y sesión React | |
| `packages/ui` | Sistema visual "Sello" (Tailwind v4) compartido por las cuatro apps | |
| `packages/stellar` | `did:stellar` y cuentas en Horizon | |

Las decisiones de arquitectura están en [`docs/adr`](docs/adr) y el plan por fases en
[`docs/PLAN.md`](docs/PLAN.md).

## Cómo correrlo

Requisitos: Node 24 o superior y pnpm 10.

```bash
pnpm install
```

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
pnpm dev
```

Cada web app tiene su `.env.example`. Sin configurar nada, todo apunta a testnet y a la API en
`http://localhost:4000`. Para la wallet con Cavos hace falta `NEXT_PUBLIC_CAVOS_APP_ID`; sin él se
puede usar la cuenta demo.

### Demo de punta a punta en testnet

1. **Gobernanza** (3003): "Usar cuenta demo de testnet". Con `GOBERNANZA_ABIERTA=true` en la API,
   cualquier cuenta entra en desarrollo.
2. **Emisor** (3001): "Crear cuenta". En testnet, "Usar datos de ejemplo" rellena el formulario y
   el código de verificación del correo aparece en pantalla (todavía no se envían correos). La
   cuenta de firma de la institución se crea por detrás: su llave se cifra en el navegador con la
   contraseña y la API solo guarda la versión cifrada.
3. **Gobernanza**: revisar la solicitud (datos de la institución y del representante) y
   autorizarla, pedir correcciones o rechazarla, siempre con un motivo. Con correcciones, la
   institución corrige sus datos en el portal y la reenvía.
4. **Wallet** (3000): entrar y copiar el DID.
5. **Emisor**: entrar con el correo y la contraseña, crear una plantilla ("Usar datos de ejemplo"
   la rellena; carpetas y etiquetas solo organizan el portal), inscribir el DID del titular y
   emitir. Se puede emitir a varios titulares a la vez pegando DIDs o cargando un CSV. La llave de la institución firma la credencial y la transacción que ancla el
   hash en Stellar (tras recargar la página se pide la contraseña para firmar).
6. **Wallet**: abrir la credencial, elegir qué revelar y compartir el enlace o el QR.
7. **Verificador** (3002): abrir el enlace. Resultado: credencial válida.
8. **Emisor**: revocar. El mismo enlace ahora muestra "Credencial revocada".

La prueba automática equivalente contra testnet real:

```bash
pnpm --filter api smoke:testnet
```

## Calidad

```bash
pnpm lint
```

```bash
pnpm check-types
```

```bash
pnpm test
```

```bash
pnpm test:e2e
```

## Pendiente fuera del alcance de la prueba de concepto

Pruebas de conocimiento cero sobre BLS12-381, gobernanza como DAO (Entregable 4), validez legal
bajo la Ley 8454, red principal y estrategia de costo de 1 USDC por emisión, y la prueba en vivo
del driver ACTA ([`docs/acta-spike.md`](docs/acta-spike.md)).
