# payout-panel.tsx

> Protection: STANDARD

## Purpose（一句话人话）
The live "Get paid" control in the developer dashboard. Replaces the former dead "Connect payouts" button with a real Stripe Connect connect/onboard/cash-out flow.

## What It Does
- On mount fetches `/api/payouts/status` (connected? payouts enabled? balance?).
- Not connected / onboarding incomplete → "Connect payouts" / "Finish payout setup" → POST `/api/payouts/connect` → redirect to onboarding url.
- Connected + enabled + balance ≥ $10.00 → "Cash out $X" → POST `/api/payouts/withdraw` — **unless `PAYOUT_WITHDRAWALS_ENABLED` is false** (current state), in which case the button is a disabled "Cash-out coming soon" and the caption shows the 1–2 week timing notice.
- Caption shows below-minimum remaining, coming-soon timing, processing, success, or error.

## Public API
| Name | Type | Description |
|------|------|-------------|
| PayoutPanel | React component | renders button + status caption (parent renders heading/body) |

## Dependencies
- **Internal:** `@spinshare/core` (MINIMUM_PAYOUT_CENTS), `@/lib/i18n/locale-provider`, `./developer-dashboard-parts` (money).

## Important Notes
- i18n strings: connectPayouts, payoutFinishOnboarding, cashOut, payoutConnecting, payoutProcessing, payoutSuccess, payoutError, payoutConnectNotEnabled, payoutErrorWithRequestId, payoutAboveMinimum, payoutBelowMinimum.

## Planned Fix 2026-06-17

Bug: failed `/api/payouts/connect` and `/api/payouts/withdraw` responses are discarded, so the UI always shows the generic retry message even when the API returned a Stripe request id or a known Connect setup blocker.

Fix: parse sanitized API failure JSON, map known app reasons to localized copy, append Stripe request ids when present, and keep the existing generic fallback for malformed responses.

## Planned Test 2026-06-17

Add a pure helper regression test for payout error response parsing so no DOM/jsdom dependency is needed.

## Implemented Fix 2026-06-17

- Added `formatPayoutFailureMessage()` and wired connect/withdraw failures to parse sanitized API JSON.
- Known `stripe_connect_not_enabled` responses render localized copy.
- Other sanitized server messages are shown with the Stripe request id appended when present.
- Malformed responses keep the generic localized fallback.

## Planned Fix 2026-06-17 Payout Gate + Verification State

User feedback after successful Stripe connection:
- The panel still shows "Finish payout setup" while Stripe is verifying the
  connected account (`connected=true`, `detailsSubmitted=true`,
  `payoutsEnabled=false`).
- Users should not be asked to connect Stripe before they have earned the $5
  minimum; that creates high-friction onboarding before value is proven.

Fix:
- Treat `detailsSubmitted=true && payoutsEnabled=false` as a passive Stripe
  verification state, not an onboarding-incomplete state. Show a disabled
  verification label and explanatory caption.
- Below the $5 minimum, show a disabled "unlock at $5" action instead of
  Connect/Finish setup.
- Only enable Connect/Finish setup once the durable balance meets the minimum.
- Keep cash-out enabled only when connected, payouts are enabled, and balance
  meets the minimum.

Regression risks:
- Do not block already enabled accounts from cashing out.
- Do not hide provider error messages returned from connect/withdraw failures.
- Keep the pure helper shape testable without adding a DOM harness.

## Implemented Fix 2026-06-17 Payout Gate + Verification State

- Added `getPayoutButtonState()` so payout action state is pure and covered by
  focused unit tests.
- Below the payout minimum, the button is disabled and says payouts unlock at
  the $5 minimum instead of offering Stripe Connect.
- When Stripe has account details but has not enabled payouts yet, the button
  is disabled and says Stripe is verifying.
- The verification caption explains that cash-out unlocks after Stripe approval
  and the minimum balance.
- Existing sanitized error display remains the highest-priority caption.

Verification:
- RED helper tests failed before implementation because `getPayoutButtonState`
  did not exist.
- GREEN focused test passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/payout-panel.test.ts`
  with 5 tests.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Payout minimum raised to $10.00; added disabled "Cash-out coming soon" state driven by `PAYOUT_WITHDRAWALS_ENABLED` (connect stays available). | Cursor |
| 2026-06-17 | Implemented payout minimum gate and Stripe verification UI state. | Codex |
| 2026-06-17 | Planned payout minimum gate and Stripe verification UI state. | Codex |
| 2026-06-17 | Implemented clearer payout provider error display. | Codex |
| 2026-06-17 | Planned clearer payout provider error display. | Codex |
| 2026-06-14 | Created | Kiro |
