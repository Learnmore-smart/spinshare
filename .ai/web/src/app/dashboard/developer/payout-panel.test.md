# payout-panel.test.ts

> Last updated: 2026-06-17 | Protection: STANDARD

## Purpose

Regression tests for payout panel error response parsing.

## What It Does

- Verifies known payout provider reasons map to localized copy.
- Verifies sanitized server messages and request ids are surfaced.
- Verifies malformed provider responses keep the generic fallback.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Vitest suite | Test file | Exercises pure payout panel helper behavior. |

## Dependencies

- Internal: `./payout-panel`.
- External: Vitest.

## Important Notes / NEVER Change

- Do not use real Stripe or browser navigation in this test.
- Keep this as a pure helper test unless the project adds a DOM test harness.

## Planned Test

Cover the bug where `/api/payouts/connect` returns useful sanitized JSON but the UI drops it and shows only the generic retry string.

## Implemented Test

Pure helper tests cover:
- known Connect setup blockers;
- sanitized server messages with Stripe request ids;
- malformed response fallback.

## Planned Test 2026-06-17 Payout Gate + Verification State

Add pure helper regressions for payout button state:
- A below-minimum, not-connected developer should see a disabled "unlock at
  $5" action and no connect action.
- A connected account with `detailsSubmitted=true` but `payoutsEnabled=false`
  should show a disabled Stripe verification state, not "Finish payout setup".

## Implemented Test 2026-06-17 Payout Gate + Verification State

Added `getPayoutButtonState()` tests covering:
- below-minimum developers get no Stripe Connect action;
- submitted-but-not-enabled connected accounts show verification copy instead
  of finish setup copy.

Verification:
- RED run failed with `getPayoutButtonState is not a function`.
- GREEN run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/payout-panel.test.ts`
  with 5 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Added payout gate and verification state helper tests. | Codex |
| 2026-06-17 | Planned payout gate and verification state helper tests. | Codex |
| 2026-06-17 | Added payout panel error parsing tests. | Codex |
| 2026-06-17 | Created payout panel error parsing test doc. | Codex |
