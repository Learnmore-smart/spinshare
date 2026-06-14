# Implementation Plan: SpinShare Ad Exchange

## Overview

This plan builds the SpinShare monorepo in strict dependency order. We bootstrap the pnpm + Turborepo workspace, then implement the pure `@spinshare/core` package (money math, bidding, velocity, types, Zod schemas) that every other artifact depends on. From there we build the `/web` provider abstraction (ports + credential-free in-memory/emulator adapters + composition root), wire up the bidding and ledger engines and their HTTP routes, add the durable Flush_Process, layer in auth and Stripe funding, render the dashboards, and finally build the CLI wrapper and VSCode extension. The plan closes with the end-to-endS settlement test that proves the 60/40 split.

All money is computed with the integer-cent / micro-cent functions in `@spinshare/core` and reused everywhere (API, flush, e2e) so results can never disagree. Implementation language is **TypeScript** throughout (per the design). Property-based tests use **fast-check** at **≥100 iterations** (`fc.assert(..., { numRuns: 100 })`) and each references its design Property number.

## Tasks

- [x] 1. Bootstrap the pnpm + Turborepo monorepo
  - [x] 1.1 Initialize workspace tooling and shared config
    - Create root `package.json` with workspace devDeps and scripts: `build`, `dev`, `test`, `test:e2e` (`turbo run test:e2e --filter=@spinshare/web`), `lint`, `emulators`
    - Create `pnpm-workspace.yaml` listing `["web", "cli-wrapper", "vscode-extension", "packages/*"]`
    - Create `turbo.json` with `build` (`dependsOn: ["^build"]`), `test`, `test:e2e`, `lint` pipeline + caching
    - Create `tsconfig.base.json` with shared compiler options and path aliases
    - Create `.env.example` documenting `SPINSHARE_MODE`, `FIRESTORE_EMULATOR_HOST`, `SPINSHARE_COUNTER`, `FIREBASE_DATABASE_URL`, `STRIPE_MODE`, `AUTH_MODE`
    - _Requirements: 1.1, 11.1_

- [x] 2. Build the pure `@spinshare/core` package (foundation for all money/bidding logic)
  - [x] 2.1 Scaffold `@spinshare/core` package
    - Create `packages/core/package.json` and `tsconfig.json` configured to emit ESM + CJS + `.d.ts`
    - Create `packages/core/src/index.ts` barrel export
    - _Requirements: 2.1_

  - [x] 2.2 Implement domain types
    - Create `packages/core/src/types.ts`: `Campaign`, `User`, `LedgerEntry`, `Split`, ad request/response and track request/response contract types
    - _Requirements: 1.3, 1.6, 2.7, 3.5_

  - [x] 2.3 Implement Zod validation schemas
    - Create `packages/core/src/schemas.ts`: campaign creation schema (adText 1–60 non-whitespace, `cpmCents` 1–100000), funding-amount schema (100–10000000 cents, one-cent precision), track request schema
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 9.7_

  - [x] 2.4 Implement integer-cent money math
    - Create `packages/core/src/money.ts`: `MICROCENTS_PER_CENT`, `perImpressionRevenueMicrocents(cpmCents)`, `roundHalfUpToCents`, and `computeSplit(cpmCents)` returning `{ revenueMicrocents, developerCreditCents, spinshareRetentionMicrocents }`; retention computed by subtraction to guarantee conservation
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 2.5 Write property tests for money math
    - **Property 4: Per-impression revenue equals CPM/1000** — Validates: Requirements 2.1
    - **Property 5: Developer credit is 60% rounded to the nearest cent** — Validates: Requirements 2.2
    - **Property 6: Split conservation (no money created or lost)** — Validates: Requirements 2.3, 2.6
    - Run each with fast-check `{ numRuns: 100 }`; tag with `// Feature: spinshare-ad-exchange, Property N: ...`

  - [x] 2.6 Implement pure bidding selection
    - Create `packages/core/src/bidding.ts`: `selectWinner(candidates)` filtering `budgetCents > 0 && cpmCents > 0`, and `isBetterBid` giving strict total order (higher CPM, then earliest `createdAtMs`, then lowest `id`)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

  - [x] 2.7 Write property tests for bidding
    - **Property 1: Eligibility-gated selection** — Validates: Requirements 1.1, 1.4
    - **Property 2: Highest-CPM winner with deterministic tie-break** — Validates: Requirements 1.2, 1.3, 1.5, 1.6
    - **Property 3: Selection is order-independent (determinism)** — Validates: Requirements 1.5
    - Run each with fast-check `{ numRuns: 100 }`

  - [x] 2.8 Implement velocity window helpers
    - Create `packages/core/src/velocity.ts`: `windowStartEpochMin(nowEpochSec)` = `floor(nowEpochSec / 60)`, threshold constant (30), shadow-ban TTL (3600s), and a pure sequence reducer for budget/balance conservation
    - _Requirements: 10.1, 10.2, 2.4, 2.8_

  - [x] 2.9 Write property tests for conservation and validation schemas
    - **Property 7: Budget decremented by full revenue** — Validates: Requirements 2.4
    - **Property 8: Non-negative balances and budget conservation across sequences** — Validates: Requirements 2.4, 2.8, 9.8
    - **Property 14: Campaign creation accepts valid input and starts at zero budget** — Validates: Requirements 9.1
    - **Property 15: Campaign creation rejects all invalid input** — Validates: Requirements 9.2, 9.3, 9.4
    - **Property 16: Funding amount validation** — Validates: Requirements 9.6, 9.7
    - Run each with fast-check `{ numRuns: 100 }`; reuse shared arbitraries (campaigns, CPMs, impression sequences) from core test utilities

- [x] 3. Checkpoint - core package
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Build the `/web` provider abstraction layer and credential-free adapters
  - [x] 4.1 Scaffold `@spinshare/web` Next.js App Router app
    - Create `web/package.json` (depends on `@spinshare/core`), Next.js config, base `tsconfig.json`, and `app/` skeleton
    - _Requirements: 7.1_

  - [x] 4.2 Define provider ports (interfaces)
    - Create `web/src/server/ports/`: `CounterStore`, `CampaignRepository`, `UserRepository`, `LedgerRepository`, `PaymentGateway`, `AuthProvider`
    - _Requirements: 2.5, 3.1, 4.7, 9.8_

  - [x] 4.3 Implement in-memory / mock adapters
    - Create `web/src/server/adapters/memory/`: `MemoryCounterStore` (atomic `applyImpression` under a single synchronous critical section: credit balance, decrement budget, increment velocity, read shadow-ban, enqueue ledger entry), in-memory campaign/user/ledger repos, `MockPaymentGateway`, `MockAuthProvider`
    - Inject a `Clock` and id generator for deterministic time/`entryId`
    - _Requirements: 2.5, 3.1, 10.1_

  - [x] 4.4 Implement Firestore emulator adapters
    - Create `web/src/server/adapters/firestore/`: campaign/user/ledger repos using the real Firestore client driven by `FIRESTORE_EMULATOR_HOST`; `appendEntries` idempotent via deterministic doc id (`entryId`)
    - _Requirements: 3.2, 3.5_

  - [x] 4.5 Implement composition root and health endpoint
    - Create `web/src/server/container.ts` selecting adapters from `SPINSHARE_MODE` / provider flags
    - Create `app/api/health/route.ts` returning `200` once ready
    - _Requirements: 11.1_

- [x] 5. Implement the Bidding Engine and `GET /api/ad`
  - [x] 5.1 Implement bidding service
    - Create `web/src/server/bidding-service.ts`: load `CampaignRepository.listBiddable()`, delegate to core `selectWinner`, wrap in a 500ms timeout returning `{ adAvailable: false }` on timeout/empty
    - _Requirements: 1.1, 1.2, 1.4, 1.7_

  - [x] 5.2 Implement `GET /api/ad` route
    - Create `app/api/ad/route.ts` returning winner shape (`adAvailable`, `campaignId`, `adText`, `cpmCents`, `cpmUsd`) or `{ adAvailable: false }`
    - _Requirements: 1.3, 1.4, 1.6, 1.7_

  - [x] 5.3 Write unit/integration tests for `GET /api/ad`
    - Test winner response shape, no-candidate response, and timeout fallback
    - _Requirements: 1.3, 1.4, 1.7_

- [x] 6. Implement the Ledger Engine and `POST /api/track`
  - [x] 6.1 Implement ledger service with velocity and shadow-ban
    - Create `web/src/server/ledger-service.ts`: validate token via `AuthProvider.validateToken` (401), load campaign (422 if missing/`budgetCents <= 0`), increment velocity window, evaluate shadow-ban (31st+ in window → set 60-min ban), compute split via core, and `applyImpression` only when not banned; return identical success shape when banned
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 6.2 Implement `POST /api/track` route
    - Create `app/api/track/route.ts`: Zod-validate body (`400`), `401` on auth failure, `422` on invalid/insufficient campaign, `200` success with `developerCreditCents`/`developerCreditUsd`
    - _Requirements: 2.7, 2.8, 2.9_

  - [x] 6.3 Write property test for money-movement guards
    - **Property 9: Invalid requests never move money** — Validates: Requirements 2.8, 2.9, 4.7
    - Run with fast-check `{ numRuns: 100 }` against in-memory adapters

  - [x] 6.4 Write property tests for velocity and shadow-ban
    - **Property 17: Velocity threshold triggers shadow-ban on the 31st impression** — Validates: Requirements 10.1, 10.2
    - **Property 18: Shadow-ban yields success response with zero money movement** — Validates: Requirements 10.3, 10.4, 10.5
    - **Property 19: Shadow-ban restores after the 60-minute cooldown** — Validates: Requirements 10.6
    - Run each with fast-check `{ numRuns: 100 }`, advancing the injected `Clock`

  - [x] 6.5 Write integration test for atomic impression update
    - Verify `applyImpression` applies balance credit + budget decrement + ledger enqueue as one unit (no partial money move)
    - _Requirements: 2.5_

- [x] 7. Checkpoint - bidding + ledger
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the Redis→Firestore Flush_Process
  - [x] 8.1 Implement flush service
    - Create `web/src/server/flush-service.ts`: `drainPending(batchSize)` → `batchToken`, idempotent Firestore transaction (`appendEntries` keyed by `entryId` + apply aggregate balance/budget deltas), then `ackDrained`; retain in-flight batch on Firestore failure for retry
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 8.2 Write property test for reconciliation conservation
    - **Property 10: Reconciliation conserves totals with one durable entry per impression** — Validates: Requirements 3.3, 3.5
    - Run with fast-check `{ numRuns: 100 }`

  - [x] 8.3 Write property test for flush idempotency
    - **Property 11: Flush idempotency (retry never double-counts)** — Validates: Requirements 3.4, 3.5
    - Run with fast-check `{ numRuns: 100 }`; apply flush twice and assert identical Firestore state

  - [x] 8.4 Write integration test for Firestore emulator flush
    - Drain pending entries and verify durable ledger entries + aggregated deltas land in the emulator
    - _Requirements: 3.2, 3.3, 3.5_

- [x] 9. Implement authentication (device flow + NextAuth)
  - [x] 9.1 Implement device-authorization endpoints
    - Create `app/api/auth/device/start/route.ts` (returns `deviceCode`, `userCode`, `verificationUri`, `verificationUriComplete`, `intervalSec`, `expiresInSec=300`) and `app/api/auth/device/token/route.ts` (`authorization_pending` / `slow_down` / `expired_token` / `access_denied` / success token)
    - _Requirements: 4.1, 4.2, 4.4, 4.6_

  - [x] 9.2 Implement NextAuth provider and token validation
    - Wire NextAuth (Auth.js) with Google + GitHub (and `MockAuthProvider` for local); implement `AuthProvider.validateToken` resolving `userId`
    - _Requirements: 4.3, 4.7_

  - [x] 9.3 Write integration test for device flow timeout
    - Verify a flow that is not approved within `expiresInSec` returns `expired_token`
    - _Requirements: 4.6_

- [x] 10. Implement campaign management and Stripe funding
  - [x] 10.1 Implement campaign endpoints
    - Create `app/api/campaigns/route.ts`: `POST` validates via core schema (`201` budget 0, or `400` field error), `GET` lists advertiser campaigns
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 10.2 Implement Stripe checkout
    - Create `app/api/funds/checkout/route.ts` + `StripeGateway`/`MockPaymentGateway.createCheckoutSession`; validate amount 100–10000000 cents and one-cent precision (`400` otherwise)
    - _Requirements: 9.6, 9.7_

  - [x] 10.3 Implement Stripe webhook
    - Create `app/api/webhooks/stripe/route.ts`: verify signature via `PaymentGateway.verifyAndParseWebhook` (`400` on bad sig, no mutation), idempotent by `paymentEvents/{eventId}`, increment `campaigns/{id}.budgetCents` once within 60s, always `200` on verified events
    - _Requirements: 9.8, 9.9, 9.10_

  - [x] 10.4 Write property test for verified payment application
    - **Property 12: Verified payment increases budget by exactly the amount, once** — Validates: Requirements 9.8, 9.9
    - Run with fast-check `{ numRuns: 100 }`

  - [x] 10.5 Write property test for unverifiable webhooks
    - **Property 13: Unverifiable webhooks never mutate budget** — Validates: Requirements 9.10
    - Run with fast-check `{ numRuns: 100 }`

  - [x] 10.6 Write integration test for webhook signature handling
    - Verify valid signed payload applies once and a tampered payload is rejected with no mutation
    - _Requirements: 9.8, 9.10_

- [x] 11. Checkpoint - auth + funding
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Build the web UI
  - [x] 12.1 Implement cyberpunk theme and Shadcn setup
    - Configure Tailwind theme tokens (neon-green `#00FF00` on near-black), install/configure Shadcn UI components and Recharts theming
    - _Requirements: 7.1_

  - [x] 12.2 Implement landing page
    - Create `app/page.tsx` with the value proposition and two distinct visible controls (Developer sign-in, Advertiser sign-in) each initiating the browser auth flow
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 12.3 Implement developer dashboard
    - Create `app/dashboard/developer/` with KPI cards (total earnings), Recharts earnings-over-time chart, activity ledger table, empty/error states, and unauthenticated redirect
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 12.4 Implement advertiser dashboard
    - Create `app/dashboard/advertiser/`: campaign builder (live 60-char counter, CPM $0.01–$1000.00), campaign list with remaining budget + CPM, "Add Funds" → Stripe checkout ($1.00–$100,000.00), empty/error states
    - _Requirements: 9.1, 9.5, 9.6_

  - [x] 12.5 Write property test for developer dashboard rendering
    - **Property 25: Developer dashboard reflects the ledger** — Validates: Requirements 8.1, 8.3
    - Run with fast-check `{ numRuns: 100 }` rendering from ledger fixtures

- [x] 13. Build the `/cli-wrapper` package
  - [x] 13.1 Scaffold `@spinshare/cli` package
    - Create `cli-wrapper/package.json` (`spinshare` bin, depends on `@spinshare/core` types) and `src/index.ts` entry
    - _Requirements: 5.1_

  - [x] 13.2 Implement spinner-interception transform
    - Create `cli-wrapper/src/renderer.ts`: pure stream transform suppressing spinner-only frames `{ |, /, -, \ }` (with CR/ANSI), rendering ad text on a single `\r`-updating line, forwarding non-spinner bytes unmodified and in order
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 13.3 Write property test for spinner suppression and pass-through
    - **Property 21: Spinner suppression and non-spinner pass-through** — Validates: Requirements 5.3, 5.5
    - Run with fast-check `{ numRuns: 100 }` over generated spinner/non-spinner interleavings

  - [x] 13.4 Implement child-process wrapper with impression reporting
    - Create `cli-wrapper/src/wrap.ts` + `api-client.ts`: spawn target (`child_process.spawn`, inherited stdin), pipe stdout through the renderer, detect wait-state start/end, send exactly one `POST /api/track` per wait state (debounced), use cached ad from `GET /api/ad` with neutral fallback (no impression) when none, and exit with child's exit code (`128 + signal` on signal termination)
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7_

  - [x] 13.5 Write property test for one impression per wait state
    - **Property 22: Exactly one impression per wait state** — Validates: Requirements 5.7
    - Run with fast-check `{ numRuns: 100 }`

  - [x] 13.6 Write property test for exit-code passthrough
    - **Property 23: Exit-code passthrough** — Validates: Requirements 5.6
    - Run with fast-check `{ numRuns: 100 }`

  - [x] 13.7 Implement `spinshare login` and credential storage
    - Create `cli-wrapper/src/login.ts`: run device flow, open system browser (print URL fallback), poll for token, store token via keytar or `0600` config file, reuse on subsequent runs
    - _Requirements: 4.1, 4.2, 4.5, 4.6_

  - [x] 13.8 Write property test for token storage round-trip
    - **Property 20: Device token storage round-trip** — Validates: Requirements 4.5
    - Run with fast-check `{ numRuns: 100 }` against a mock credential store

- [x] 14. Build the `/vscode-extension` package
  - [x] 14.1 Scaffold extension package
    - Create `vscode-extension/package.json` + `src/extension.ts` activating only stable `vscode` APIs (VSCode/Trae/Cursor compatible)
    - _Requirements: 6.5_

  - [x] 14.2 Implement ad controller with progress notification
    - Create `vscode-extension/src/ad-controller.ts` + `api-client.ts`: on generation start fetch `GET /api/ad`, show ad in `withProgress({ location: ProgressLocation.Notification })`, report exactly one `POST /api/track`, dismiss within 1s on completion
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 14.3 Implement authentication prompt
    - Create `vscode-extension/src/auth.ts`: when unauthenticated, prompt to complete the browser device flow before displaying ads
    - _Requirements: 6.4_

  - [x] 14.4 Write property test for one impression per generation
    - **Property 24: One impression per generation** — Validates: Requirements 6.3
    - Run with fast-check `{ numRuns: 100 }` against a mocked `vscode` API

- [x] 15. Implement the end-to-end settlement test
  - [x] 15.1 Implement e2e harness
    - Create `web/test/e2e/` harness that starts the Next.js app in `SPINSHARE_MODE=local` on an ephemeral port and polls `/api/health` until ready, failing after a 60s startup timeout
    - _Requirements: 11.1, 11.8_

  - [x] 15.2 Implement settlement assertions (`npm run test:e2e`)
    - Seed advertiser + campaign (fixed CPM, budget > one impression) funded via simulated Stripe webhook, mint a valid `Device_Auth_Token` via `MockAuthProvider`, `POST /api/track` exactly once below the velocity limit, force a flush, then assert within one-cent tolerance: balance +60% revenue, budget −full revenue, retention == 40% and credit + retention == revenue; on mismatch report expected/actual/difference
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 16. Final checkpoint - full verification gate
  - Ensure `pnpm build`, `pnpm test` (unit + property at ≥100 iterations), and `pnpm test:e2e` all pass; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific requirements (and property number where applicable) for traceability.
- All property-based tests use **fast-check** at **≥100 iterations** and are tagged `// Feature: spinshare-ad-exchange, Property N: ...`.
- All monetary logic lives in `@spinshare/core` (integer cents / micro-cents) and is reused by the API, the Flush_Process, and the e2e test so they can never disagree.
- Checkpoints provide incremental validation; the final checkpoint is the design's verification gate.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.6", "2.8"] },
    { "id": 4, "tasks": ["2.5", "2.7", "2.9", "4.1"] },
    { "id": 5, "tasks": ["4.2"] },
    { "id": 6, "tasks": ["4.3", "4.4"] },
    { "id": 7, "tasks": ["4.5", "5.1", "13.1", "14.1"] },
    { "id": 8, "tasks": ["5.2", "6.1", "8.1", "9.1", "13.2", "14.2"] },
    { "id": 9, "tasks": ["5.3", "6.2", "8.2", "9.2", "10.1", "13.3", "13.4", "14.3"] },
    { "id": 10, "tasks": ["6.3", "6.4", "6.5", "8.3", "8.4", "9.3", "10.2", "10.3", "13.5", "13.6", "13.7", "14.4"] },
    { "id": 11, "tasks": ["10.4", "10.5", "10.6", "12.1", "13.8", "15.1"] },
    { "id": 12, "tasks": ["12.2", "12.3", "12.4", "15.2"] },
    { "id": 13, "tasks": ["12.5"] }
  ]
}
```
