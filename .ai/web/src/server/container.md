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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Doc created; Redis→RTDB counter selection (`SPINSHARE_COUNTER`) | Kiro |
