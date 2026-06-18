# web/src/app/api/payouts/withdraw/route.ts

> Last updated: 2026-06-16 | Protection: CRITICAL

## Purpose

Cashes out the signed-in developer's durable balance to their Stripe Connect
account.

## What It Does

- Rejects cross-origin or origin-less POSTs before money movement.
- Requires a browser-authenticated developer session.
- Delegates balance reservation, Stripe transfer, and typed business failures to
  `withdrawBalance()`.
- Maps provider failures to a sanitized `502 payout_withdraw_failed` response
  without leaking Stripe secrets or raw headers.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `POST(request)` | Next route handler | Returns payout result, typed business failure, auth failure, CSRF failure, or sanitized provider failure. |

## Dependencies

- **Internal:** `auth` - browser session.
- **Internal:** `assertSameOrigin` - CSRF guard.
- **Internal:** `getContainer` - user and payout ports.
- **Internal:** `withdrawBalance` - money-moving service.
- **External:** `@spinshare/core` - USD formatting.

## Agent Decisions / Thoughts

- **2026-06-16 Codex:** The service already restores reserved balance when the
  provider call throws. The route still needs a clean user-facing/provider-facing
  error boundary so Stripe SDK details are not exposed.
- **2026-06-16 Codex:** Implemented a local `providerFailureBody()` mapper and
  catch around `withdrawBalance()`. It logs only the sanitized body and returns
  a sanitized `502`.

## Important Notes / NEVER Change

- CSRF and authentication must happen before `withdrawBalance()`.
- Do not leak provider secrets, request headers, or raw Stripe error objects.
- Do not duplicate money movement logic in the route.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-16 | Provider payout failures could bubble as generic/raw 500s. | The route delegated to `withdrawBalance()` without catching Stripe/Connect exceptions. | Added sanitized `502 payout_withdraw_failed` mapping. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented sanitized provider failure mapping. | Codex |
| 2026-06-16 | Created mirror before adding withdraw provider failure tests. | Codex |

## Planned Change 2026-06-16 Developer Payout Events

Record developer activity rows for successful payouts, typed blocked attempts,
and provider transfer failures. The route remains the HTTP adapter; money
movement stays inside `withdrawBalance()`.

## Implemented Change 2026-06-16 Developer Payout Events

The route now records best-effort `developer_event` activity rows for
`payoutPaid`, `payoutBlocked`, and `payoutFailed`. Activity write failures are
logged and do not change money movement results.

## Implemented Change 2026-06-16 Payout Attempt Ledger

The route now passes `container.payoutAttempts` into `withdrawBalance()`. The
HTTP adapter still owns activity rows and sanitized responses; provider
reconciliation writes live inside the payout service.
