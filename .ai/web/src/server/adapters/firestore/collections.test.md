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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented full collection assertion coverage including activity paths. | Codex |
| 2026-06-15 | Planned full collection assertion coverage including activity paths. | Codex |
| 2026-06-15 | Created doc before adding namespace tests. | Codex |
