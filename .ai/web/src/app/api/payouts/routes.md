# api/payouts/* routes

> Protection: PROTECTED (moves real money)

## Purpose（一句话人话）
Session-authenticated (NextAuth) developer payout endpoints backing the dashboard "Get paid" panel.

## Endpoints
| Route | Method | Behavior |
|-------|--------|----------|
| `/api/payouts/connect` | POST | Ensure/reuse Stripe Connect account, persist its id, return hosted onboarding `url`. 401 if no session. |
| `/api/payouts/status` | GET | `{ connected, payoutsEnabled, detailsSubmitted, balanceCents }`; refreshes eligibility from Stripe. 401 if no session. |
| `/api/payouts/withdraw` | POST | Pay out the full durable `balanceCents` if ≥ $5.00 and payouts enabled; debit balance by the amount paid. 401 / 409 not_connected / 422 below_minimum / 200. |

## Dependencies
- **Internal:** `@/server/adapters/auth/nextauth-config` (`auth()`), `@/server/container` (`users`, `payouts`), `@spinshare/core` (MINIMUM_PAYOUT_CENTS, formatCentsAsUsd).

## Important Notes / NEVER Change
- Auth is the browser session (not the device bearer token) since these back dashboard buttons.
- Withdraw pays only the durable (flushed) balance — never the unflushed hot-path delta.
- Debit uses an atomic balance delta of exactly the paid amount.

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created | Kiro |

## Security update (2026-06-14)
- `/connect` and `/withdraw` (POST, money-moving) now call `assertSameOrigin(request)` FIRST → `403 forbidden_origin` on cross-origin/origin-less requests (CSRF defense). See `server/http/csrf.ts`.
- `/withdraw` logic extracted to `server/payout-service.ts` (`withdrawBalance`); the route is a thin adapter. `/status` is GET (safe, no CSRF guard).
- Tests: `server/payout-service.test.ts` (withdraw flow), `server/http/csrf.test.ts` (guard), `server/earning-cap.test.ts` (anti-bot cap).
