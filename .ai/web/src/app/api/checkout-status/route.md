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

## Dependencies

- `ActivityRepository.listByCheckoutSessionId()`
- `CampaignRepository.getById()`

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented public checkout status endpoint. | Codex |
| 2026-06-16 | Planned public checkout status endpoint. | Codex |
