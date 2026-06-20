# collections.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests Firestore collection path resolution.

## Planned Coverage

- Default collection paths remain the existing top-level names.
- `SPINSHARE_FIRESTORE_NAMESPACE=test` maps collections under `namespaces/test/...` so localhost can avoid writing production top-level collections.
- The assertion list covers every Firestore collection currently exposed by `COLLECTIONS`.

## Implemented Coverage 2026-06-15

Both default and namespace assertions now include every collection currently in
`COLLECTIONS`, including activity and progress collections.

## Implemented Coverage 2026-06-16 Payout Attempt Ledger

Default and namespace assertions now include `payoutAttempts`, preventing local
payout reconciliation records from escaping the Firestore namespace.

## Planned Change 2026-06-20 Canonical Identity

Assert that `userIdentities` follows the same top-level and namespaced collection
path rules as every other Firestore collection.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added `payoutAttempts` namespace assertions. | Codex |
| 2026-06-15 | Implemented full collection assertion coverage including activity paths. | Codex |
| 2026-06-15 | Planned full collection assertion coverage including activity paths. | Codex |
| 2026-06-15 | Created doc before adding namespace tests. | Codex |
