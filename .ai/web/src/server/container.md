# container.ts

> Last updated: 2026-06-13 | Protection: CRITICAL (composition root)

## Purpose（一句话人话）

The single place that binds concrete adapters to the provider ports based on
environment flags. Promoting local→production is a config change, not a code
change.

## Selection flags

| Flag | Values | Selects |
|------|--------|---------|
| `SPINSHARE_MODE` | `local` (default) \| `production` | overall defaults |
| `SPINSHARE_COUNTER` | `memory` \| `rtdb` | `CounterStore` |
| `FIREBASE_DATABASE_URL` | RTDB url | required when counter = `rtdb` |
| `FIRESTORE_EMULATOR_HOST` | host:port | Firestore vs in-memory repos |
| `STRIPE_MODE` | `mock` \| `test` \| `live` | `PaymentGateway` |
| `AUTH_MODE` | `mock` \| `oauth` | `AuthProvider` |

## CounterStore selection (post-migration)

- `local` mode → defaults to `MemoryCounterStore`.
- `production` mode → defaults to `RealtimeDbCounterStore` (Firebase RTDB),
  which requires `FIREBASE_DATABASE_URL`. The old Redis/Upstash placeholder and
  `SPINSHARE_REDIS` flag were removed in the Google-native migration.

## Firebase credentials (production)

When `SPINSHARE_MODE=production` (or Firestore is selected without the emulator),
`FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` **must** be set. Without them
the Admin SDK falls back to Application Default Credentials, which fails locally
and surfaces as the developer dashboard error state.

`buildContainer` throws at startup with an explicit message if production mode
needs Firestore but service-account creds are absent.

## Local mode + Firebase creds (bug fix 2026-06-14)

**Bug:** `SPINSHARE_MODE=local` with `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`
in `.env` still selected Firestore repos. Cloud Firestore had no active campaigns,
so `GET /api/ad` returned `{ adAvailable: false }` and the CLI test showed only a
blank line (spinner suppressed, no ad text).

**Fix:** In `local` mode, durable repos default to **in-memory + `seedLocalTestData`**
even when Firebase service-account creds are present (OAuth still works). Firestore
is used locally only when:
- `FIRESTORE_EMULATOR_HOST` is set, or
- `SPINSHARE_USE_FIRESTORE=1` (explicit opt-in to hit cloud Firestore from local dev).

## Planned Change 2026-06-15

Local development should not seed the funded LearnX demo campaign by default. It hides whether Stripe test/webhook/local checkout actually funded the campaign being tested. Keep the seed path available only behind an explicit `SPINSHARE_SEED_LOCAL_DATA=1` flag.

## Implemented Change 2026-06-15

Local demo seed now runs only when `SPINSHARE_SEED_LOCAL_DATA=1` and `NODE_ENV=development`. Added `container.test.ts` coverage for default-off and explicit-on behavior.

## Planned Change 2026-06-15 Activity Ledger

Wire a new `ActivityRepository` into the container for attempt-level impression activity records. Use memory in local mode and Firestore when durable repos are selected.

## Implemented Change 2026-06-15 Activity Ledger

`Container` now exposes `activities`. Local/in-memory mode wires
`MemoryActivityRepository`; Firestore-selected mode wires `FirestoreActivityRepo`.

## Planned Change 2026-06-15 Cumulative Viewability

Wire a new `ImpressionProgressRepository` into the container. Local/in-memory
mode should use `MemoryImpressionProgressRepository`; Firestore-selected mode
should use `FirestoreImpressionProgressRepo`. This keeps pending ad progress
durable in production and isolated in local memory by default.

## Planned Change 2026-06-15 Local Firestore Isolation

When `SPINSHARE_MODE=local` opts into real cloud Firestore with
`SPINSHARE_USE_FIRESTORE=1` and no `FIRESTORE_EMULATOR_HOST`, require
`SPINSHARE_FIRESTORE_NAMESPACE` to be set. This prevents localhost Stripe and
dashboard testing from writing top-level production collections. Firestore
emulator usage remains allowed without a namespace because it is already a
local disposable datastore.

## Implemented Change 2026-06-15 Local Firestore Isolation

`buildDurableRepos()` now calls a fail-fast guard before constructing Firestore
repos. Local cloud Firestore opt-in without `SPINSHARE_FIRESTORE_NAMESPACE`
throws an explicit error. Emulator and production selection are unchanged.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented fail-fast namespace guard for local cloud Firestore. | Codex |
| 2026-06-15 | Planned fail-fast namespace guard for local cloud Firestore. | Codex |
| 2026-06-15 | Planned ImpressionProgressRepository container binding. | Codex |
| 2026-06-15 | Implemented ActivityRepository container binding. | Codex |
| 2026-06-15 | Planned ActivityRepository container binding. | Codex |
| 2026-06-15 | Implemented explicit `SPINSHARE_SEED_LOCAL_DATA=1` gate. | Codex |
| 2026-06-15 | Planned explicit opt-in for local seed data to avoid LearnX polluting local payment diagnosis. | Codex |
| 2026-06-14 | Local mode: in-memory repos by default; Firestore only via emulator or `SPINSHARE_USE_FIRESTORE=1` | Cursor |
| 2026-06-14 | Fail fast when production Firestore selected without service-account creds | Cursor |
| 2026-06-13 | Doc created; Redis→RTDB counter selection (`SPINSHARE_COUNTER`) | Kiro |
