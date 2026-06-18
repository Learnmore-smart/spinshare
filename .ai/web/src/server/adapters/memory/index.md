# index.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Barrel export for in-memory and mock adapters.

## Planned Change

Export `MemoryActivityRepository` so the composition root can wire it in local
mode and tests can import it from the memory adapter barrel when useful.

## Implemented Change 2026-06-15

Exports `MemoryActivityRepository`.

## Implemented Change 2026-06-16 Payout Attempt Ledger

Exports `MemoryPayoutAttemptRepository` for service tests and local/mock
provider reconciliation.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Exported memory payout attempt repository. | Codex |
| 2026-06-15 | Implemented memory activity repository export. | Codex |
| 2026-06-15 | Created doc before exporting memory activity repository. | Codex |
