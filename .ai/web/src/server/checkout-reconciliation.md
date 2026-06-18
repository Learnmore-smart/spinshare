# checkout-reconciliation.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Shared Stripe Checkout Session reconciliation for campaign funding when the
webhook has not applied yet.

## What It Does

- Reads provider-verified Checkout Session funding state by session id.
- Confirms the paid session belongs to the expected campaign.
- Uses `paymentEvents.markApplied()` as the idempotency gate before applying
  campaign budget.
- Records `budgetFunded` advertiser activity after funding is applied.
- Supports dashboard read-time reconciliation for pending checkouts scoped to
  owned campaigns.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `reconcilePaidCheckoutSession` | function | Reconcile one known checkout session and source activity. |
| `reconcilePaidCheckoutSessionsForCampaigns` | function | Reconcile pending checkout sessions for a bounded owned campaign list. |

## Dependencies

- Internal: `@/server/container` types for repositories and gateways.
- Internal: `@/server/ports` activity and payment contracts.
- External: `@spinshare/core` money formatting and campaign type.

## Agent Decisions / Thoughts

- 2026-06-16 Codex: This helper exists because both the homepage
  `checkout-status` route and advertiser dashboard need the same fallback when
  Stripe webhook forwarding is absent or delayed. The dashboard variant must be
  scoped to owned campaign ids so it does not scan or mutate unrelated
  advertisers.

## Important Notes / NEVER Change

- Never apply funding without `paymentEvents.markApplied()` first.
- Never reconcile a session when Stripe's `campaignId` differs from the source
  activity campaign id.
- Provider lookup failures should not make advertiser dashboard reads fail.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-16 | Paid local Stripe checkout can stay invisible in dashboard/ranking when webhook was not forwarded. | Only `/api/checkout-status` reconciled paid sessions; dashboard reads did not. | Add shared checkout reconciliation helper for status and owned campaign reads. |

## Implemented Change 2026-06-16

Added shared reconciliation functions:

- `reconcilePaidCheckoutSession(container, sessionId, sourceEvent)` performs
  the provider lookup, campaign match check, idempotency claim, budget apply,
  and funded activity write for one known Checkout Session.
- `reconcilePaidCheckoutSessionsForCampaigns(container, campaigns)` scans
  bounded owned campaign activity for pending `checkoutStarted` sessions and
  best-effort reconciles paid sessions without blocking dashboard reads on
  lookup failures.

`/api/checkout-status` now uses the shared single-session helper, preserving its
previous behavior. `/api/campaigns` uses the owned-campaign helper and refreshes
campaigns after reconciliation so dashboard budget and market eligibility are
current.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented shared checkout reconciliation helper. | Codex |
| 2026-06-16 | Created plan for shared checkout reconciliation helper. | Codex |
