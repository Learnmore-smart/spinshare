# smoke-local-checkout.test.mjs

> Last updated: 2026-06-17 | Protection: STANDARD

## Purpose

Pure helper tests for the local advertiser checkout smoke script.

## What It Does

- Validates success predicates for checkout, market, ad feed, dashboard
  campaign list, and advertiser activity response shapes.
- Keeps runtime smoke assertions deterministic and compact.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Vitest tests | tests | Cover local checkout smoke helper predicates and summaries. |

## Dependencies

- Internal: `web/scripts/smoke-local-checkout.mjs`.
- External: `vitest`.

## Important Notes / NEVER Change

- Tests should not start a real Next.js server.
- Tests should not call Stripe.
- Runtime verification belongs to `corepack pnpm@9.12.0 smoke:local-checkout`.

## Planned Change 2026-06-17

Write failing tests first for the helper predicates before implementing the
smoke script.

## Agent Decisions / Thoughts

- 2026-06-17 Codex: The RED test should prove the product contract, not only
  module existence. It will use pure fixture responses for checkout, market,
  ad feed, advertiser campaigns, and advertiser activity. Runtime server
  startup stays out of the unit test and belongs to `smoke:local-checkout`.
- 2026-06-17 Codex: The purchased smoke campaign should use a CPM higher than
  the seeded local sample campaign so `/api/ad` selection is deterministic. The
  separate market predicate still verifies it appears in the public leaderboard
  instead of only asserting ad selection.

## Implemented Change 2026-06-17

Added helper tests for settled checkout, market visibility, authenticated ad
selection, same-email advertiser dashboard visibility, and advertiser activity
rows.

## Verification 2026-06-17

- RED: focused test failed because `smoke-local-checkout.mjs` did not exist.
- GREEN: focused test passed with 6 tests after the script was implemented.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Added local checkout smoke helper tests. | Codex |
| 2026-06-17 | Documented RED helper-test behavior before adding the test file. | Codex |
| 2026-06-17 | Planned local checkout smoke helper tests. | Codex |
