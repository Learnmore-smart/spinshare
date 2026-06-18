# web/src/server/flush-service.ts

> Last updated: 2026-06-16 | Protection: CRITICAL

## Purpose

Reconciles hot-path pending impression entries into durable ledger, user
balance, and campaign budget repositories.

## What It Does

- Drains pending entries from `CounterStore`.
- Appends durable ledger entries idempotently by `entryId`.
- Applies grouped user balance deltas and campaign budget deltas.
- Acknowledges drained hot-counter work only after durable writes succeed.
- Nacks and returns the batch to pending state on durable write failure.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `runFlushCycle(deps, batchSize?)` | function | Runs one reconciliation cycle. |
| `DEFAULT_FLUSH_BATCH_SIZE` | constant | Default max pending entries per cycle. |

## Dependencies

- **Internal:** `CounterStore` - source of pending hot-path work.
- **Internal:** `LedgerRepository` - durable impression records.
- **Internal:** `UserRepository` - durable developer balances.
- **Internal:** `CampaignRepository` - durable campaign budget remaining.
- **External:** `@spinshare/core` - money-unit constants and ledger types.

## Agent Decisions / Thoughts

- **2026-06-16 Codex:** The service is the source of truth for money movement
  during reconciliation. HTTP routes or schedulers should call this function
  but not replicate its ledger/balance/budget logic.
- **2026-06-16 Codex:** `POST /api/internal/flush` now delegates to this service
  and keeps the route limited to auth, response mapping, and error redaction.

## Important Notes / NEVER Change

- Do not ack drained work before durable writes complete.
- Do not derive balance/budget deltas from mutable counters; derive them from
  drained ledger entries so retries are safe.
- Preserve idempotency by ledger `entryId`.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-16 | Service had no production-facing trigger in the codebase. | Reconciliation was implemented but not callable by a scheduler. | Add a protected internal route that delegates to this service. |
| 2026-06-17 | Credited impressions never reached `ledgerEntries`; dashboard showed $0 while the activity feed showed credits. Entries piled up in RTDB `pending/ledger` (prod: ledger=0, users=0). | The whole cycle nacked forever because `users.applyBalanceDeltaCents` threw `User not found` (JWT sessions create no durable user doc); a deleted campaign threw similarly. | `applyBalanceDeltaCents` now upserts; the per-campaign budget delta is best-effort (skip a missing campaign). `appendEntries` (idempotent) stays the only nack/retry trigger, so exactly-once is preserved. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Made the per-campaign budget delta best-effort so a deleted campaign can no longer poison reconciliation; balance upsert lives in UserRepository. | Claude |
| 2026-06-16 | Noted protected HTTP route delegation after implementation. | Codex |
| 2026-06-16 | Created mirror documentation before adding route wiring. | Codex |
