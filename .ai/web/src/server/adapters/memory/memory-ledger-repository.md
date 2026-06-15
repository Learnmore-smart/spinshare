# memory-ledger-repository.ts

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Provides the in-memory `LedgerRepository` implementation used by local development and tests.

## What It Does

- Stores durable ledger entries in a process-local `Map` keyed by `entryId`.
- Appends entries idempotently so retrying a flush cannot double-count.
- Lists entries by developer for dashboard summaries.
- Counts entries by campaign id for the public market table.
- Exposes seed/read helpers for tests and local demo data.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `MemoryLedgerRepository` | class | In-memory implementation of `LedgerRepository`. |
| `appendEntries` | method | Idempotently appends ledger entries. |
| `listByDeveloper` | method | Returns entries credited to a developer. |
| `countByCampaignIds` | method | Returns impression counts keyed by campaign id. |
| `seed` | method | Test/local helper for inserting entries synchronously. |

## Dependencies

- **Internal:** `../../ports/ledger-repository` - implements the shared ledger port.
- **External:** `@spinshare/core` - `LedgerEntry` domain type.

## Important Notes / NEVER Change

- Preserve idempotency by `entryId`; duplicate entries must not overwrite or increment counts twice.
- Keep returned ledger entries copied, not mutable references to the internal map.
- `countByCampaignIds` should return all requested campaign ids with zero counts when no entries match.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-14 | `tsc --noEmit` fails in `countByCampaignIds` with `Object is possibly 'undefined'`. | The code mutates `counts[entry.campaignId]` after a dynamic-key guard, but TypeScript cannot narrow indexed access on `Record<string, number>`. | Store the current count in a local variable, test it for `undefined`, then write back `current + 1`. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created mirror doc and documented `countByCampaignIds` type-safety fix. | Codex |
