# route.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests advertiser activity ledger API.

## Planned Coverage

- Unauthenticated requests return 401.
- Authenticated advertiser receives activity for campaigns owned by user id.
- Same-email login can claim public checkout campaigns via the shared public
  advertiser id rule.
- Activity from other advertisers is excluded.

## Implemented Coverage 2026-06-15

Tests cover unauthenticated rejection plus direct-owner and same-email public
checkout campaign activity, excluding another advertiser's campaign.

## Implemented Coverage 2026-06-15 Advertiser Money Events

The owned-campaign test now includes an `advertiser_event` row and verifies that
amount/provider fields survive the advertiser activity API serialization.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Added advertiser money event API coverage. | Codex |
| 2026-06-15 | Implemented advertiser activity route tests. | Codex |
| 2026-06-15 | Created doc before adding advertiser activity route tests. | Codex |
