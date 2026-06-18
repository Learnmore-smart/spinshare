# campaign-builder.test.tsx

> Last updated: 2026-06-17 | Protection: STANDARD

## Purpose

Tests advertiser campaign builder rendering and helper-visible behavior.

## What It Does

- Guards that the create form includes the impression block input needed to
  start Stripe Checkout from the Create campaign action.
- Guards draft persistence helpers so a Stripe cancel redirect can restore the
  user's campaign setup fields.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `CampaignBuilder` tests | Vitest tests | Render the client component to static markup. |

## Dependencies

- Internal: `./campaign-builder`.
- External: `vitest`, `react`, `react-dom/server`.

## Agent Decisions / Thoughts

- 2026-06-17 Codex: Use static markup coverage because this test suite mostly
  runs in Node without Testing Library/jsdom. Route tests cover the actual
  checkout creation behavior.

## Important Notes / NEVER Change

- Prefer behavior-facing text/attribute assertions over component internals.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented campaign builder checkout-block and draft persistence tests. | Codex |
| 2026-06-17 | Planned campaign builder draft persistence helper tests. | Codex |
| 2026-06-17 | Created doc before adding campaign builder checkout-block test. | Codex |
