# route.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Public low-information status endpoint for a Stripe Checkout Session redirect.

## Planned Behavior 2026-06-16

`GET /api/checkout-status?checkout_session_id=cs_...` should let the homepage
or support tooling explain a checkout outcome without requiring advertiser
login first.

Response model:

- `400` when the session id is missing or malformed.
- `404` with status `unknown` when no local checkout activity exists for the
  session id.
- `200` with status `pending_webhook` when checkout was created but no
  `budgetFunded` activity exists yet.
- `200` with status `funded` when funding activity exists. Include enough
  campaign state to explain leaderboard eligibility: campaign id, budget cents,
  public leaderboard flag, biddable flag, and leaderboard eligible flag.

Privacy constraints:

- Do not expose contact email or authenticated user identity.
- Do not require a bearer token because homepage checkout intentionally supports
  buying before registration.

## Implemented Behavior 2026-06-16

The route now accepts `checkout_session_id` or `sessionId`, validates a `cs_...`
session id shape, looks up advertiser activity by Checkout Session id, and
returns:

- `400 { error: "invalid_checkout_session_id" }` for missing/malformed ids;
- `404 { sessionId, status: "unknown" }` when no local activity exists;
- `200 { status: "pending_webhook", campaign }` when checkout was created but
  funding has not been recorded;
- `200 { status: "funded", campaign }` once a `budgetFunded` event exists.

The campaign payload includes only id, budget cents, public leaderboard flag,
biddable flag, and leaderboard eligibility.

## Bug Fix Plan 2026-06-16 Stripe Return Reconciliation

Bug: in `SPINSHARE_MODE=local` with `STRIPE_MODE=test`, a real Stripe Checkout
can complete successfully but the campaign stays `budgetCents=0` if the Stripe
webhook is not forwarded to the same local process. The homepage banner reports
`pending_webhook`, the public market/leaderboard filters the campaign out, and
the advertiser believes payment is broken.

Root cause: the browser success redirect has `checkout_session_id`, but the
route only reads local activity. It never asks Stripe whether the session is
already paid, so a missing/delayed webhook cannot be reconciled.

Fix strategy:

- Keep webhooks as the primary settlement path.
- When local activity exists for the Checkout Session and funding has not been
  recorded, ask the payment gateway for the Checkout Session funding state.
- Only apply fallback funding when Stripe says the session is paid, the session
  campaign id matches the local checkout-started activity, the campaign exists,
  and the amount is positive.
- Use a Checkout Session idempotency key shared with the webhook route
  (`checkout_session:{sessionId}`) so fallback reconciliation and later webhook
  delivery do not double-credit.
- Record a `budgetFunded` advertiser activity row with `checkoutSessionId` so
  later status reads return `funded`.

## Bug Fix Implemented 2026-06-16 Stripe Return Reconciliation

`GET /api/checkout-status` now attempts a best-effort reconciliation only when
local checkout activity exists and the status is not already funded. It calls
`PaymentGateway.retrieveCheckoutSessionFunding(sessionId)` and applies fallback
funding only when the returned session is paid, the campaign id matches the
checkout-started activity, the campaign exists, and the amount is positive.

Fallback funding uses `checkout_session:{sessionId}` as the idempotency key,
applies the budget delta once, and records a `budgetFunded` advertiser activity
with the Checkout Session id. Mismatched/unknown/unpaid sessions remain
`pending_webhook`.

## Planned Change 2026-06-16 Shared Checkout Reconciliation Helper

Move the paid-session reconciliation logic into
`web/src/server/checkout-reconciliation.ts` so the homepage checkout status
route and advertiser dashboard campaign route share the same idempotency and
provider-verification rules. The status route behavior should remain unchanged;
the refactor exists to let dashboard reads also repair paid-but-unwebhooked
local Stripe sessions.

## Implemented Change 2026-06-16 Shared Checkout Reconciliation Helper

`GET /api/checkout-status` now imports
`reconcilePaidCheckoutSession` from the shared server helper. The response model
and existing tests are unchanged; focused verification with
`src/app/api/checkout-status/route.test.ts` and
`src/app/api/campaigns/route.test.ts` passed 12 tests.

## Dependencies

- `ActivityRepository.listByCheckoutSessionId()`
- `CampaignRepository.getById()`
- `PaymentGateway.retrieveCheckoutSessionFunding()`
- `PaymentEventStore.markApplied()`

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented extraction to shared checkout reconciliation helper. | Codex |
| 2026-06-16 | Planned extraction to shared checkout reconciliation helper. | Codex |
| 2026-06-16 | Implemented Stripe return reconciliation fallback. | Codex |
| 2026-06-16 | Planned Stripe return reconciliation fallback. | Codex |
| 2026-06-16 | Implemented public checkout status endpoint. | Codex |
| 2026-06-16 | Planned public checkout status endpoint. | Codex |
