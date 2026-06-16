# route.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests developer attempt-level activity ledger API.

## Planned Coverage

- Unauthenticated requests return 401.
- Authenticated developer receives only their own activity entries.
- Money fields include cents and USD display strings.

## Planned Change 2026-06-15 Activity Ledger

Change the authenticated case to seed `container.activities` with credited and
too-short attempts, then assert the API returns only the current developer's
activity records.

## Implemented Change 2026-06-15 Activity Ledger

Developer activity tests now cover credited and too-short attempt records and
exclude another developer's activity.

## Implemented Coverage

All planned cases are covered in `route.test.ts`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented attempt-level developer activity tests. | Codex |
| 2026-06-15 | Planned attempt-level developer activity API tests. | Codex |
| 2026-06-15 | Added developer activity API tests. | Codex |
| 2026-06-15 | Created doc before adding developer activity tests. | Codex |
