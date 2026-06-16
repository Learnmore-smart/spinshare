# container.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests composition-root adapter selection and local development safety switches.

## Planned Coverage

- Local development memory repos should not seed the funded LearnX campaign unless explicitly requested.
- `SPINSHARE_SEED_LOCAL_DATA=1` should keep the demo seed path available.
- Local cloud Firestore opt-in must fail fast without `SPINSHARE_FIRESTORE_NAMESPACE`.
- Firestore emulator opt-in should remain allowed without namespace.

## Implemented Coverage 2026-06-15

Added local Firestore isolation tests:
- `SPINSHARE_USE_FIRESTORE=1` without emulator or namespace throws.
- `FIRESTORE_EMULATOR_HOST` remains allowed without namespace.

## Dependencies

- `web/src/server/container.ts`
- `web/src/server/dev/seed-local-data.ts`

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented local Firestore namespace guard tests. | Codex |
| 2026-06-15 | Planned local Firestore namespace guard tests. | Codex |
| 2026-06-15 | Created doc before adding container seed tests. | Codex |
