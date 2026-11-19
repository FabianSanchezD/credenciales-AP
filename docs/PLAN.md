# Implementation plan: Entregable 2 (Don Rufino PoC)

Source: *Entregable 2 – Planteamiento Conceptual de la Plataforma de Acreditación*.
Goal of the PoC: a microcredential can be **issued → stored → presented → verified → revoked**
end to end on Stellar testnet, and an **altered credential fails verification**.

## Where we are (2026-11-18, end of day)

All phases 0 to 8 are built. The full flow (authorize, template, issue, share, verify, revoke,
verify again) was run live in the four web apps against Stellar testnet, and
`pnpm --filter api smoke:testnet` runs the same flow automatically.

| Area | State |
| --- | --- |
| Phase 0: ADRs (`docs/adr`) | Done |
| Phases 1 to 7: API, shared packages, four web apps | Done, tested live on testnet |
| Phase 8: rate limiting, Redis option, Spanish responsive UI, Tabla 1 indicators | Done |
| Cavos login in the wallet | Built and configured with a development App ID; it is the only titular login (demo accounts removed) |
| ACTA driver | Tested live on 2026-11-18: issuance needs one API key per issuer and an issuer `did:stellar` in the ACTA registry; the PoC stays on the `stellar` driver (ADR 0001) |
| Usability test with real testers (RNF-08) and deployment | Pending, needs people and hosting |

The original "where we started" snapshot: monorepo, `@repo/stellar`, emisores and titulares APIs
in memory, and the Cavos hook without UI.

## Principles for working gradually

- One phase = one or a few small PRs, each green in CI and demoable.
- Every PR names the RF/RNF IDs it covers, so progress maps back to the document.
- De-risk third parties (ACTA, Cavos) **before** building on top of them.
- Get one thin end-to-end slice working early, then widen it.

---

## Phase 0: Spikes and decisions (de-risk)

1. **ACTA spike** (script in `scratch/` or a test, testnet only): create a vault through
   `vc-vault-factory`, issue a VC, read hash + status, verify, revoke.
   Answer open decision #1: *can the emisor revoke on a vault the titular owns?*
   If not, pick the workaround (emisor as vault co-admin, an issuer-side status list, etc.).
2. **Cavos + ACTA together**: can a Cavos (passkey) account own/authorize the vault and have
   the creation sponsored?
3. **Persistence decision**: emisores, titulares and plantillas are in memory today. Pick the
   store (e.g. Postgres + `@nestjs/drizzle`); Redis stays only for sessions/queues (Tabla 7).
4. Write the outcomes as short ADRs in `docs/adr/` and replace the starter `README.md`.

**Done when:** ADRs exist for ACTA revocation, vault ownership and persistence.

## Phase 1: Walking skeleton (thin end-to-end slice)

Hardcoded emisor + one fixed template, minimal UI, but real chain calls:

- `packages/credenciales`: VC 2.0 types + zod schema from Tabla 6
  (`resultadosAprendizaje` and `contexto` required: salvaguarda S1).
- API `acta` adapter module (port + ACTA implementation, so the provider can be swapped).
- Issue one credential to a titular DID, anchor hash on testnet, verify it via the API.

**Done when:** one script/e2e test issues and verifies a credential on testnet. (RF-06, RF-08 partial)

## Phase 2: Trust registry and governance (Entidad que autoriza)

- API: move emisores/titulares to the chosen DB; endpoints to authorize/suspend an emisor.
- Gobernanza app: list pending emisores, authorize/suspend (simple admin auth for the PoC).
- Emisor sign-in: challenge signed with the emisor's Stellar key (key never touches the API).

**Done when:** only `autorizado` emisores can request issuance. (Trust registry, Fig. 1)

## Phase 3: Titular Digital Wallet UI

- Wallet app: sign in with Cavos (passkey/email), show DID + QR to share with an emisor.
- Create the titular's `vc-vault` (sponsored) on first use.
- Block an emisor (RF-02).

**Done when:** a non-technical tester creates a wallet and shares their DID without help. (RF-01, RF-02, RNF-02, RNF-08)

## Phase 4: Plantillas (emisor templates)

- API `plantillas` module: learning outcomes, hours, level, modality, formal/no formal: all required.
- Emisor portal: create/edit own templates; platform never edits them (salvaguarda autonomía).

**Done when:** a template without learning outcomes or context is rejected. (RF-05)

## Phase 5: Issuance flow (full)

- Emisor portal: pick template + titular DID → API validates (authorized + complete template)
  → ACTA adapter builds VC and **unsigned XDR** → emisor signs in browser (Stellar Wallets Kit)
  → submit → hash + `válida` anchored, encrypted content in the titular vault.
- Wallet: list credentials with issuer, date, outcomes, status (RF-03).

**Done when:** the full 5.2 flow runs from the UIs on testnet. (RF-06, RF-03, RNF-01, RNF-05)

## Phase 6: Presentation and verification

- Wallet: choose attributes to reveal, generate QR/link (RF-04).
- API verification module: the 4 checks: signature ↔ issuer DID, hash ↔ chain, status, issuer
  in registry; return which check failed.
- Verificador app: open QR/link with no account, show *válida / revocada / inválida* + issuer
  name + date (RF-08, RF-09). Store nothing presented (salvaguarda privacidad).
- Negative tests: altered credential, unknown issuer, revoked credential.

**Done when:** valid passes, altered fails, result in ≤ 10 s. (RNF-03, RNF-04, RNF-07)

## Phase 7: Revocation

- Emisor portal: revoke with reason + date, using the mechanism chosen in Phase 0.
- Titular cannot revoke/un-revoke; credential stays in the wallet but fails verification.
- Correction flow: revoke old + issue new.

**Done when:** revocation shows up in the next verification immediately. (RF-07)

## Phase 8: Hardening and PoC readiness

- Redis for sessions/queues (no personal data), rate limiting on public verifier.
- Spanish, responsive UI pass (RNF-09); usability test with testers (RNF-08 ≥ 90 %).
- Indicators from Tabla 1 (e.g. 100 % credentials with context, $0 paid by titular/verificador).
- Deploy the 4 apps + API; demo script for Don Rufino.

## Out of PoC scope (later deliverables)

ZK proofs on BLS12-381, governance as a DAO (Entregable 4), Ley 8454 legal validity,
mainnet + 1 USDC issuance cost strategy.
