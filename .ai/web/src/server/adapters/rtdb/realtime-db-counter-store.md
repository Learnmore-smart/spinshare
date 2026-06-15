# realtime-db-counter-store.ts

> Last updated: 2026-06-13 | Protection: CRITICAL (hot-path money movement)

## Purpose（一句话人话）

Google-native replacement for Redis/Upstash: implements the `CounterStore` port
on top of Firebase Realtime Database (RTDB) via `firebase-admin`'s
`getDatabase()`. Counts impressions cheaply and atomically in RTDB, then lets
the flush process batch them into Firestore once per cycle.

## What It Does

Backs the production hot path with RTDB instead of Redis. All state lives under
a configurable root (default `spinshare/hot`):

```
spinshare/hot
  bal/{userId}                 number  — pending developer balance delta (cents)
  bud/{campaignId}             number  — pending campaign budget delta (micro-cents, ≤ 0)
  pending/ledger/{entryId}     { entry: LedgerEntry, enqueuedAt: number }  — durable queue
  inflight/{batchToken}        { entries: {...}, meta: { deltas } }  — drained, not-yet-acked
  velocity/{userId}/{windowStartSec}  number  — fixed 60s window count
  shadowban/{userId}           number  — epoch millis the ban expires
```

## Public API

| Name | Type | Description |
|------|------|-------------|
| `RealtimeDbCounterStore` | class implements `CounterStore` | RTDB-backed hot path |

## Atomicity & Idempotency strategy

- **`applyImpression`** is idempotent and atomic for the money invariant:
  1. A single-path RTDB **transaction** on `pending/ledger/{entryId}` writes the
     queued entry only if absent. A non-null current value aborts → duplicate
     (no money moves). Single-path keeps concurrency high (conflicts only on the
     same `entryId`, i.e. the duplicate case).
  2. On a fresh write, an **atomic multi-path `update()`** bumps the fast
     `bal`/`bud` counters with `ServerValue.increment`.
  The authoritative per-impression record is the queued ledger entry; the
  `bal`/`bud` counters are a fast-read denormalization. The flush service
  re-derives durable deltas from the entries themselves (`aggregateDeltas`), so
  a counter that is momentarily stale (e.g. process crash between step 1 and 2)
  can never cause a double-count — at worst the fast read is briefly low.
- **`drainPending`** atomically moves up to `maxEntries` queued entries into
  `inflight/{batchToken}` and removes them from `pending/ledger` in one
  multi-path `update()`, recording the aggregate deltas under the batch meta.
- **`ackDrained`** subtracts the drained deltas from `bal`/`bud` and deletes the
  in-flight batch (atomic multi-path update). Idempotent: unknown token = no-op.
- **`nackDrained`** restores the in-flight entries to `pending/ledger` and
  deletes the batch. Counters are untouched by drain, so re-surfacing fully
  restores the batch (Requirement 3.4).

## Dependencies

- **External:** `firebase-admin/database` — `getDatabase`, `ServerValue`.
- **Internal:** `./client` (`getRealtimeDb`), `../../ports/counter-store`,
  `../memory/clock` (`Clock`/`IdGenerator` for deterministic time + batch ids),
  `@spinshare/core` (`MICROCENTS_PER_CENT`).

## Important Notes / NEVER Change

- Money convention MUST match `MemoryCounterStore`: balances in whole cents,
  budgets accumulated in micro-cents and converted at the port boundary.
- Idempotency gate MUST stay a single-path transaction; do NOT root it at a
  shared ancestor (that would serialize all impressions globally).
- RTDB keys come from `entryId`/`userId`/`campaignId` which are already valid
  Firestore doc ids (no `/ . # $ [ ]`), so they are safe as RTDB keys.

## Planned Change (2026-06-15)

Add aggregate campaign telemetry counters under the RTDB hot-path tree. The
new counters are campaign-scoped only and must not store prompts, request
content, raw user ids, IP addresses, or other private content.

## Implemented Change (2026-06-15)

Added RTDB-backed `campaignTelemetry/{campaignId}/{metric}` increments and
zero-filled reads for advertiser dashboard aggregate telemetry.

## Verification (2026-06-15)

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created — RTDB CounterStore replacing the Redis/Upstash placeholder | Kiro |
