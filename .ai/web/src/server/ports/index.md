# index.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Barrel export for server provider ports.

## Planned Change

Export the new `ActivityRepository` and activity record types so routes and
container code can depend on the port instead of concrete adapters.

## Implemented Change 2026-06-15

Exports `ActivityRepository`, `ImpressionActivity`, and
`ImpressionActivityStatus`.

## Planned/Implemented Change 2026-06-15 Advertiser Money Events

Export the unified activity record types required by advertiser activity routes:
`ActivityRecord`, `AdvertiserActivity`, and `AdvertiserActivityStatus`.

## Implemented Change 2026-06-16 Payout Attempt Ledger

Exports `PayoutAttempt`, `PayoutAttemptRepository`, `PayoutAttemptStatus`, and
`PayoutAttemptUpdate` for durable payout provider reconciliation.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Exported payout attempt repository port types. | Codex |
| 2026-06-15 | Exported advertiser money activity record types. | Codex |
| 2026-06-15 | Implemented activity repository port exports. | Codex |
| 2026-06-15 | Created doc before exporting activity repository port. | Codex |
