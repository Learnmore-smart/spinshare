# seed-learnx-campaign.test.mjs

## Purpose

Tests the LearnX Firestore seed helper behavior without contacting Firestore.

## Planned Coverage

- Default campaign collection path remains top-level `campaigns`.
- `SPINSHARE_FIRESTORE_NAMESPACE=test` resolves to
  `namespaces/test/campaigns`, matching the app's Firestore adapter.
- Invalid namespace values are rejected before a write can happen.
- The seeded demo destination URL is `https://www.learnx.pro`.

## Implemented Coverage 2026-06-17

Added script-level Vitest coverage for namespace path resolution, invalid
namespace rejection, and the LearnX destination URL constant. The test imports
the seed module without contacting Firestore.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented namespace-aware LearnX seed tests. | Codex |
| 2026-06-17 | Created doc before adding namespace-aware LearnX seed tests. | Codex |
