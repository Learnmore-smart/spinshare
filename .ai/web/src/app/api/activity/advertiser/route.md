# route.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Authenticated advertiser activity ledger API.

## Planned Behavior

- Validate bearer `Device_Auth_Token`.
- Resolve owned campaigns by `claims.userId` and, when present, the public
  advertiser id derived from `claims.email`.
- Return attempt-level activity rows for owned campaign ids only.
- Include credited and non-credited outcomes so advertisers can see charged and
  uncharged exposure attempts.

## Implemented Behavior 2026-06-15

`GET /api/activity/advertiser` authenticates, resolves direct and public-email
campaign ownership, and returns `impression_attempt` activity rows for owned
campaign ids.

## Planned Change 2026-06-15 Advertiser Money Events

Return a unified advertiser activity timeline, not only impression attempts.
Rows for owned campaigns may include:

- `impression_attempt`
- `advertiser_event` with event status `checkoutStarted`, `budgetFunded`, or
  `budgetDebited`

Keep ownership filtering identical: direct advertiser id plus same-email public
checkout id.

## Implemented Change 2026-06-15 Advertiser Money Events

The route now branches activity serialization by record type. Impression
attempts keep the existing shape; advertiser money events return `type:
"advertiser_event"` plus amount, provider event id, and checkout session id
when present.

## Implemented Change 2026-06-15 Pagination

Return bounded newest-first ledger pages instead of an unbounded array. Support
`limit` and `cursor` query parameters and include `nextCursor` when more rows
exist. Ownership filtering stays unchanged.

## Verification 2026-06-15 Advertiser Money Events

- Red focused run failed because advertiser events were serialized as
  impression attempts and lost amount/provider fields.
- Green focused run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/activity/advertiser/route.test.ts src/app/api/webhooks/stripe/route.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts src/app/api/track/route.test.ts src/app/dashboard/activity-feed.test.ts`.
- Pagination focused run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/activity/developer/route.test.ts src/app/api/activity/advertiser/route.test.ts`.
- Full regression passed after pagination:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented advertiser activity pagination. | Codex |
| 2026-06-15 | Planned advertiser activity pagination. | Codex |
| 2026-06-15 | Implemented unified advertiser activity timeline events. | Codex |
| 2026-06-15 | Planned unified advertiser activity timeline events. | Codex |
| 2026-06-15 | Implemented advertiser activity route. | Codex |
| 2026-06-15 | Created doc before adding advertiser activity route. | Codex |

## Implemented Change 2026-06-16 Developer Payout Event Boundary

The route now explicitly ignores `developer_event` rows if they ever appear in
an activity record union. Advertiser timelines remain campaign-scoped and never
show developer payout activity.
