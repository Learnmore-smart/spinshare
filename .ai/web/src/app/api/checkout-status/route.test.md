# route.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Tests public checkout-session status diagnostics.

## Planned Coverage 2026-06-16

- Missing or malformed session id returns `400`.
- Unknown session id returns `404` with status `unknown`.
- A checkout-started activity without funding returns `pending_webhook`.
- A funded session returns `funded` and campaign leaderboard eligibility
  details.

## Implemented Coverage 2026-06-16

All planned route cases are covered in `route.test.ts`. RED failed because the
route and activity repository lookup did not exist; GREEN passed after adding
the route and repository lookup.

## Planned Coverage 2026-06-16 Stripe Return Reconciliation

Add route-level coverage before implementation:

- Given a checkout-started activity and an injected payment gateway that reports
  the same `cs_...` session as paid for the same campaign, `GET
  /api/checkout-status` should apply the campaign budget, record funded
  activity, and return `funded`.
- Given a paid session for a different campaign id, the route must not apply
  budget and should remain `pending_webhook`.
- A repeated status read after fallback funding must not double-credit.

## Implemented Coverage 2026-06-16 Stripe Return Reconciliation

`route.test.ts` now injects a fake payment gateway to verify paid-session
fallback funding, funded activity recording, repeat-read idempotency, and
campaign-id mismatch rejection.

## Planned Coverage 2026-06-20 Delivery Inventory

Extend paid-session reconciliation coverage to assert exact purchased inventory
is credited once with budget and remains unchanged on repeated status reads.

## Dependencies

- `web/src/app/api/checkout-status/route.ts`
- memory activity repository
- memory campaign repository

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned checkout-status reconciliation inventory coverage. | Codex |
| 2026-06-16 | Implemented Stripe return reconciliation coverage. | Codex |
| 2026-06-16 | Planned Stripe return reconciliation coverage. | Codex |
| 2026-06-16 | Implemented checkout status route coverage. | Codex |
| 2026-06-16 | Planned checkout status route coverage. | Codex |
