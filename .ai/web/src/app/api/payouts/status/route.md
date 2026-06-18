# web/src/app/api/payouts/status/route.ts

> Last updated: 2026-06-16 | Protection: CRITICAL

## Purpose

Returns the signed-in developer's payout onboarding state and durable available
balance.

## What It Does

- Requires a browser-authenticated developer session.
- Reads the developer user record and durable balance.
- Refreshes Stripe Connect payout eligibility when a connected account exists.
- Runs a best-effort pending flush before reading durable balance so recently
  credited impressions are visible in payout eligibility.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `GET()` | Next route handler | Returns `{ connected, payoutsEnabled, detailsSubmitted, balanceCents }` or `401`. |

## Dependencies

- **Internal:** `auth` - browser session.
- **Internal:** `getContainer` - user and payout ports.
- **Internal:** `flushPendingForRead` - planned best-effort reconciliation before balance read.

## Agent Decisions / Thoughts

- **2026-06-16 Codex:** Payout status is a user-visible balance read, so it
  should share the same read-your-writes guard as the developer dashboard.
- **2026-06-16 Codex:** Flush failure must not block the status endpoint. The
  endpoint should still return the last durable balance.
- **2026-06-16 Codex:** Implemented `flushPendingForRead(container,
  "payouts-status")` before `users.getById()`.

## Important Notes / NEVER Change

- Do not expose provider secrets or raw Stripe errors from this status endpoint.
- Keep browser-session authentication; this endpoint is not a device-token API.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Wired best-effort pending flush before balance read. | Codex |
| 2026-06-16 | Created route mirror before adding best-effort flush wiring. | Codex |
