# checkout-status-banner.test.tsx

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Tests the homepage checkout return banner's parsing and user-facing status copy.

## What It Does

- Verifies URL query parsing for success, cancelled, and ordinary visits.
- Verifies funded/pending/unknown/error copy without requiring a browser DOM.
- Keeps page-level mounting covered by `page.test.tsx`.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Checkout status banner tests | Vitest tests | Regression coverage for checkout return copy |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| None | N/A | No | Test file |

## Dependencies

- External: `vitest` for assertions.
- Internal: `./checkout-status-banner` for pure helpers.

## Planned Coverage 2026-06-16

- No checkout params returns hidden/no-op state.
- `checkout=cancelled` maps to the cancelled state.
- `checkout=success&checkout_session_id=cs_...` captures the session id.
- Funded copy says the campaign is eligible for the leaderboard when the API
  says so.
- Funded-but-private copy explains why a paid ad may not show publicly.
- Pending webhook copy tells the advertiser that Stripe returned before the
  webhook finished.

## Planned Extension Coverage 2026-06-16

Add RED coverage for dashboard Add Funds redirect query params:

- `funding=success&checkout_session_id=cs_...` maps to success with the same
  session id.
- `funding=cancelled` maps to the cancelled state.

## Planned Polling Coverage 2026-06-16

Add pure-helper coverage that pending and unknown checkout states are eligible
for bounded retry, while funded/error/cancelled states are not. Also verify the
bounded attempt limit stops retries.

## Implemented Coverage 2026-06-16

The test now covers ordinary visits, cancelled redirects, successful
`cs_...` session parsing, pending webhook copy, funded leaderboard-eligible
copy, and funded-but-private copy.

## Implemented Extension Coverage 2026-06-16

The same tests now also cover dashboard Add Funds query params:
`funding=success&checkout_session_id=cs_...` and `funding=cancelled`.

## Implemented Polling Coverage 2026-06-16

Added coverage for `shouldPollCheckoutStatus()`:
pending/unknown states poll below the cap; funded, cancelled, and error states
do not; the max-attempt boundary stops retries.

## Verification 2026-06-16

- RED failed before the component existed.
- GREEN passed after adding the helpers/component.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented bounded polling helper coverage. | Codex |
| 2026-06-16 | Planned bounded polling helper coverage. | Codex |
| 2026-06-16 | Implemented dashboard funding query parsing coverage. | Codex |
| 2026-06-16 | Planned dashboard funding query parsing coverage. | Codex |
| 2026-06-16 | Implemented checkout status banner helper coverage. | Codex |
| 2026-06-16 | Created test plan for checkout status banner helpers. | Codex |
