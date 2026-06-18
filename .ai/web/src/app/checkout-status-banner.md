# checkout-status-banner.tsx

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Shows a public post-Stripe status banner on the homepage after advertiser
checkout returns.

## What It Does

- Reads checkout return parameters from the current URL.
- Stays hidden during ordinary homepage visits.
- Shows a cancelled checkout notice when `checkout=cancelled`.
- For successful checkout redirects, calls `/api/checkout-status` with the
  Stripe Checkout Session id.
- Explains whether the campaign is waiting for webhook funding, funded and
  leaderboard-eligible, funded but hidden/private, unknown, or errored.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `CheckoutStatusBanner` | React component | Client-only homepage status banner |
| `readCheckoutReturn` | function | Parses checkout return query params |
| `checkoutStatusCopy` | function | Maps state to user-facing title/body/tone |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| None | N/A | No | Production component reads `window.location.search` |

## Dependencies

- External: `react` for client state/effect.
- External: `lucide-react` for small status icons.
- Internal: `/api/checkout-status` for session diagnostics.

## Agent Decisions / Thoughts

- Keep this separate from `page.tsx` because the homepage file is already large.
- Do not expose advertiser email or account identity. The route intentionally
  reports only payment/session/campaign status.
- Keep the visual treatment restrained and consistent with homepage glass/mint
  UI; this is a diagnostics banner, not a new marketing section.

## Important Notes / NEVER Change

- Never require login for this banner. Public checkout supports pay-first
  advertisers who may register later using the same email.
- Never show raw Stripe/customer/email identity in the banner.
- Do not claim leaderboard visibility unless the backend reports
  `leaderboardEligible: true`.

## Planned Change 2026-06-16

Create the banner component with pure parsing/copy helpers so the behavior can
be tested without a browser DOM dependency.

## Planned Extension 2026-06-16

Reuse the same banner for advertiser dashboard Add Funds redirects. Dashboard
funding success URLs use `funding=success&checkout_session_id=cs_...`, while
public homepage checkout uses `checkout=success&checkout_session_id=cs_...`.
`readCheckoutReturn()` should understand both query shapes and keep the same
session-status behavior.

## Planned Polling Update 2026-06-16

Stripe can redirect back before the webhook has applied budget. A single
status fetch can therefore leave the user stuck on `pending_webhook` until a
manual refresh. Add bounded polling for pending/unknown checkout states so the
banner can flip to `funded` automatically during normal webhook latency.

Constraints:

- Do not poll ordinary homepage/dashboard visits.
- Do not poll indefinitely.
- Stop polling once the state is funded, cancelled, malformed/error, or after
  the bounded attempt limit.
- Keep the polling rule testable as a pure helper.

## Planned Fix 2026-06-17: Refresh Market After Funded Checkout

Problem: after Stripe redirects back to the homepage, `CheckoutStatusBanner`
can reconcile a paid Checkout Session and flip to `funded`, but the surrounding
homepage market table keeps its existing `/api/market` response until the next
15-second poll. That makes a newly paid advertiser think the leaderboard did not
update even when the campaign was funded successfully.

Fix plan:

- Export a small browser event name for "checkout funded".
- Add a pure helper that identifies state transitions that should refresh the
  market.
- Dispatch the event when the fetched checkout status becomes `funded`.
- Keep the banner public and login-free; do not expose email or Stripe customer
  data in the event payload.

Regression risk: duplicate events could cause extra `/api/market` reads, but
the component already stops polling once funded, so this should be bounded.

## Implemented Change 2026-06-16

Added `CheckoutStatusBanner`, `readCheckoutReturn`, and `checkoutStatusCopy`.
The component:

- reads `checkout` and `checkout_session_id` from `window.location.search`;
- stays hidden for normal homepage visits;
- calls `/api/checkout-status` for valid success redirects;
- renders pending webhook, funded, unknown, cancelled, and error states;
- shows campaign budget only when the API returns a campaign object.

## Implemented Extension 2026-06-16

`readCheckoutReturn()` now reads `params.get("checkout") ?? params.get("funding")`,
so dashboard Add Funds redirects and public homepage checkout redirects share
the same status flow.

## Implemented Polling Update 2026-06-16

Added `CHECKOUT_STATUS_POLL_MS`, `CHECKOUT_STATUS_MAX_POLLS`, and
`shouldPollCheckoutStatus()`. The component now retries pending/unknown status
responses every 2 seconds, up to 15 attempts, then stops. Funded, cancelled,
malformed/error, and ordinary hidden states do not poll.

## Implemented Fix 2026-06-17: Refresh Market After Funded Checkout

Added `CHECKOUT_FUNDED_MARKET_REFRESH_EVENT` and `shouldNotifyMarketRefresh()`.
When `/api/checkout-status` returns `funded` after a non-funded state, the
component dispatches `spinshare:checkout-funded` with bounded session/campaign
detail. This lets the homepage refresh `/api/market` immediately after checkout
reconciliation instead of waiting for the next 15-second market poll.

## Verification 2026-06-16 Polling

- RED: `checkout-status-banner.test.tsx` failed because
  `shouldPollCheckoutStatus` was missing.
- GREEN: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/checkout-status-banner.test.tsx`
  passed after adding the helper and effect polling.

## Verification 2026-06-17 Market Refresh

- RED: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/checkout-status-banner.test.tsx`
  failed because `CHECKOUT_FUNDED_MARKET_REFRESH_EVENT` was `undefined`.
- GREEN: the same focused command passed after adding the funded checkout event
  and helper.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx src/app/checkout-status-banner.test.tsx`
  passed.
- Related payment/leaderboard verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/checkout-status/route.test.ts src/app/api/market/route.test.ts src/app/api/campaigns/route.test.ts src/app/checkout-status-banner.test.tsx src/app/page.test.tsx`
  with 5 files / 25 tests.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Verification 2026-06-16

- RED: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/checkout-status-banner.test.tsx`
  failed because `./checkout-status-banner` did not exist.
- GREEN: the same focused test passed after implementation.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented funded-checkout market refresh event. | Codex |
| 2026-06-17 | Planned funded-checkout market refresh event. | Codex |
| 2026-06-16 | Implemented bounded checkout status polling. | Codex |
| 2026-06-16 | Planned bounded checkout status polling. | Codex |
| 2026-06-16 | Implemented dashboard funding query support. | Codex |
| 2026-06-16 | Planned dashboard funding query support. | Codex |
| 2026-06-16 | Implemented checkout status banner. | Codex |
| 2026-06-16 | Created design doc for checkout status banner. | Codex |
