# activity-repository.ts

> Last updated: 2026-06-15 | Protection: CRITICAL

## Purpose

Durable impression-attempt activity ledger port.

## Planned API

- `record(activity)` stores one attempt/outcome record.
- `listByDeveloper(developerId)` returns records visible to a developer.
- `listByCampaignIds(campaignIds)` returns records visible to an advertiser for owned campaigns.

## Why

The existing ledger only stores credited impressions. Product needs explainable activity for too-short displays, invalid/uncounted outcomes, and advertiser budget visibility.

## Implemented API 2026-06-15

Implemented `ActivityRepository`, `ImpressionActivity`, and
`ImpressionActivityStatus`. Supported statuses are `tooShort`, `invalidToken`,
`invalidCampaign`, `credited`, `shadowBanned`, `earningCapped`, and `duplicate`.

## Planned Change 2026-06-15 Advertiser Money Events

Extend the activity ledger port beyond impression attempts so advertiser
dashboards can explain funding and budget movement:

- keep existing `ImpressionActivity` behavior for developer-facing attempts
- add advertiser-only events for `checkoutStarted`, `budgetFunded`, and
  `budgetDebited`
- keep `listByDeveloper()` returning developer-relevant impression attempts
- make `listByCampaignIds()` return the unified activity timeline for owned
  campaigns
- preserve idempotent `record()` semantics by `activityId`

## Implemented Change 2026-06-15 Advertiser Money Events

Added `AdvertiserActivityStatus`, `AdvertiserActivity`, and `ActivityRecord`.
`ActivityRepository.record()` accepts the unified record union.
`listByDeveloper()` remains developer-impression focused, while
`listByCampaignIds()` returns all activity records for advertiser-owned
campaigns.

## Planned Change 2026-06-16 Checkout Session Lookup

Add a lookup for advertiser activity by `checkoutSessionId`. The success URL
after Stripe Checkout carries only the Checkout Session id, so a diagnostic API
needs to resolve `cs_...` back to our `checkoutStarted` / `budgetFunded`
activity rows without scanning unrelated data.

The lookup should return advertiser events only and avoid exposing developer
impression attempts.

## Implemented Change 2026-06-16 Checkout Session Lookup

`ActivityRepository` now exposes `listByCheckoutSessionId(sessionId)`, returning
only advertiser activity rows for the exact Checkout Session id.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented checkout session activity lookup. | Codex |
| 2026-06-16 | Planned checkout session activity lookup. | Codex |
| 2026-06-15 | Implemented advertiser payment/funding/debit activity events. | Codex |
| 2026-06-15 | Planned advertiser payment/funding/debit activity events. | Codex |
| 2026-06-15 | Implemented activity repository port and status model. | Codex |
| 2026-06-15 | Created doc before adding attempt-level activity repository port. | Codex |
