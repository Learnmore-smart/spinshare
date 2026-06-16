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

## Dependencies

- `web/src/app/api/checkout-status/route.ts`
- memory activity repository
- memory campaign repository

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented checkout status route coverage. | Codex |
| 2026-06-16 | Planned checkout status route coverage. | Codex |
