# ledger-service.ts

> Protection: PROTECTED (moves real money)

## Purpose（一句话人话）
Records one impression for `POST /api/track`: validates token, loads campaign, applies velocity/shadow-ban, enforces earning caps, and credits the developer split exactly once.

## What It Does (7-step flow)
1. Validate Device_Auth_Token → 401.
2. Load campaign; reject missing/zero-budget → 422.
3. Increment 60s velocity window.
4. Shadow-ban: active ban or 31st+ impression suppresses money.
5. Compute 60/40 split.
5b. **Earning caps (anti-abuse):** read credited earnings in current hour/day windows; if crediting would breach $20/hr or $300/day, suppress (no money moves, indistinguishable response).
6. If not suppressed: applyImpression (credit/decrement/enqueue) + addEarnedCents.
7. Identical success shape whether recorded or suppressed.

## Dependencies
- **Internal:** ports (AuthProvider, CampaignRepository, CounterStore), memory clock/ids.
- **External:** `@spinshare/core` (computeSplit, velocity helpers, wouldExceedEarningCap, DEVELOPER_HOURLY/DAILY_EARNING_LIMIT_CENTS).

## Important Notes / NEVER Change
- Suppressed impressions (banned OR capped) MUST NOT move money and MUST NOT count toward caps.
- Earning caps close the bot-farming hole: velocity alone allows ~1,800 imp/hr; caps bound credited earnings to $20/hr, $300/day per developer.

## Bug Fixes / Changes
| Date | Change |
|------|--------|
| 2026-06-14 | Wired server-side hourly/daily earning-cap enforcement (was UI-only). |

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Updated for earning-cap enforcement | Kiro |
