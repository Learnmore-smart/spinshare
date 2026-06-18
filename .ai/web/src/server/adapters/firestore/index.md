# index.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Barrel export for Firestore-backed adapters.

## Planned Change

Export `FirestoreActivityRepo` so the composition root can wire attempt-level
activity records when Firestore is selected.

## Implemented Change 2026-06-15

Exports `FirestoreActivityRepo` and its options type.

## Implemented Change 2026-06-16 Payout Attempt Ledger

Exports `FirestorePayoutAttemptRepo` and its options type for durable payout
attempt reconciliation.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Exported Firestore payout attempt repository. | Codex |
| 2026-06-15 | Implemented Firestore activity repository export. | Codex |
| 2026-06-15 | Created doc before exporting Firestore activity repository. | Codex |
