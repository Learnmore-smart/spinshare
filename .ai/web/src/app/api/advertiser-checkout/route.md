# route.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Public homepage endpoint that creates an advertiser campaign and starts Stripe checkout in one request.

## What It Does

- Validates the public advertiser form payload.
- Creates a zero-budget campaign with advertiser metadata and leaderboard visibility.
- Starts a Stripe checkout session for `bid per block * number of blocks`.
- Returns the hosted checkout URL for browser redirect.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `POST` | Route handler | Accepts public advertiser checkout payloads. |

## Dependencies

- Internal: `@spinshare/core` public checkout schema.
- Internal: `@/server/container` campaign and payment adapters.

## Important Notes / NEVER Change

- Campaign creation happens before Stripe.
- Real Stripe checkout remains webhook-settled: a campaign becomes biddable only after the existing Stripe webhook credits budget.
- Mock/local checkout may settle immediately when the gateway explicitly marks the session as settled.
- This route is public; validation must reject malformed payloads before mutation.

## Planned Change 2026-06-16 Ad Safety Gate

Public checkout should inherit deterministic ad-text safety validation from
`@spinshare/core` before campaign creation or Stripe checkout. If ad copy is
clearly unsafe/deceptive, return the existing `400` validation shape and perform
no mutation.

## Implemented Change 2026-06-16 Ad Safety Gate

Public checkout now inherits `adTextSchema` safety validation from core. Unsafe
copy is rejected before campaign creation, checkout creation, or activity writes.

Verification passed after rebuilding core:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/advertiser-checkout/route.test.ts src/app/api/campaigns/route.test.ts`.

## Planned Fix (2026-06-15)

Bug: in local/mock mode, public checkout returns `200` but the campaign stays hidden after reload because the mock checkout never emits a funding webhook.

Fix: after creating a checkout session, credit the campaign budget only if the gateway result includes an explicit immediate-settlement marker. Return the funded campaign object in the response for local/mock mode; keep real Stripe mode webhook-settled.

## Planned Change

Create this route with tests for valid checkout creation, invalid payload rejection, and private leaderboard persistence.

## Planned Change 2026-06-15

Extract the email-derived advertiser id algorithm into `web/src/server/advertiser-identity.ts` so homepage checkout and dashboard claim logic cannot drift.

## Implemented Change 2026-06-15

Homepage checkout now calls shared `publicAdvertiserIdForEmail()`.

## Planned/Implemented Change 2026-06-15 Advertiser Money Events

Public checkout now records best-effort advertiser activity events:

- `checkoutStarted` after a checkout session is created
- `budgetFunded` when a mock/local checkout settles immediately

Real Stripe test/live funding remains webhook-settled, so the later
`budgetFunded` row is written by `/api/webhooks/stripe`.

## Planned Change 2026-06-16 Checkout Return Context

The success URL should include Stripe's `{CHECKOUT_SESSION_ID}` placeholder as
`checkout_session_id`, so the page returned from hosted Checkout can identify
which payment is pending/funded. This is required for better post-checkout
diagnostics and future pending-payment UI.

## Implemented Change 2026-06-16 Checkout Return Context

Public checkout success URL now includes
`checkout_session_id={CHECKOUT_SESSION_ID}` before the `#bid-market` fragment.

## Verification 2026-06-16

- Red focused run failed because the returned mock URL lacked
  `checkout_session_id`.
- Green focused run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-adapters.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts`.
- Full regression passed:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Implemented Change

Added `POST /api/advertiser-checkout`. It validates the public form payload, creates a zero-budget campaign with hashed email-derived advertiser id and metadata, starts a checkout session for `cpmCents * blockCount`, and returns `{ url, sessionId, amountCents, amountUsd, campaign }`.

## Verification

- Initial focused web run failed because `./route` was missing.
- Final `corepack pnpm@9.12.0 --filter @spinshare/web test` passed: 21 files passed, 1 skipped, 93 tests passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web build` passed after allowing the configured Google Font fetch.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented public checkout ad safety gate through core schema. | Codex |
| 2026-06-16 | Planned public checkout ad safety gate through core schema. | Codex |
| 2026-06-16 | Implemented public checkout success URL session context. | Codex |
| 2026-06-16 | Planned public checkout success URL session context. | Codex |
| 2026-06-15 | Added public checkout advertiser money activity events. | Codex |
| 2026-06-15 | Switched public checkout to shared advertiser identity helper. | Codex |
| 2026-06-15 | Planned shared public advertiser identity helper extraction. | Codex |
| 2026-06-15 | Documented immediate mock-settlement plan for public checkout. | Codex |
| 2026-06-13 | Created doc before implementing public advertiser checkout endpoint. | Codex |
| 2026-06-13 | Synced doc with implemented public advertiser checkout route and verification. | Codex |
