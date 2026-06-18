# smoke-local-checkout.mjs

> Last updated: 2026-06-17 | Protection: STANDARD

## Purpose

Runs a real localhost smoke for the advertiser purchase path.

## What It Does

- Starts the local sample server with mock auth/payment and memory storage.
- Creates a public advertiser checkout using the local advertiser email.
- Verifies mock checkout funding immediately creates a funded campaign.
- Verifies the purchased campaign appears in `/api/market`.
- Verifies authenticated `/api/ad` selects the purchased campaign when it has a
  higher CPM than the seeded sample ad.
- Verifies `/api/campaigns` shows the purchased campaign for the same-email
  advertiser login.
- Verifies `/api/activity/advertiser` includes checkout/funding activity rows.
- Stops the spawned local server process tree.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `isPurchasedCheckoutResponse` | function | Validates the public checkout response shape for a settled local purchase. |
| `isPurchasedCampaignMarketResponse` | function | Validates `/api/market` contains the purchased campaign. |
| `isPurchasedCampaignAdResponse` | function | Validates `/api/ad` selects the purchased campaign. |
| `isPurchasedCampaignDashboardResponse` | function | Validates `/api/campaigns` shows the campaign to the same-email advertiser. |
| `isPurchasedCampaignActivityResponse` | function | Validates advertiser activity includes checkout and funding rows. |
| `runLocalCheckoutSmoke` | function | Full runtime smoke orchestration. |
| CLI | command | `node web/scripts/smoke-local-checkout.mjs` |

## Dependencies

- Internal: `web/scripts/smoke-local-sample.mjs` for shared JSON POST and process tree helpers.
- External: Node built-ins `child_process`, `url`.

## Important Notes / NEVER Change

- Do not use real Stripe or production storage.
- Use mock checkout against `dev:sample`; this proves the local product contract
  without requiring webhook forwarding.
- Use the local advertiser email so same-email public checkout ownership is
  verified through the dashboard API.
- Make the purchased campaign's CPM higher than the seeded sample campaign so
  `/api/ad` should deterministically select it.

## Planned Change 2026-06-17

Add this smoke because the product question is not only whether local sample ads
exist. The required flow is: public homepage-style purchase creates a funded
campaign, ranking shows it, the extension/CLI ad feed can select it, and the
advertiser dashboard can see the campaign and purchase activity when signed in
with the same email.

## Agent Decisions / Thoughts

- 2026-06-17 Codex: Keep this smoke memory-only by launching
  `dev-local-sample.mjs`; do not depend on Stripe CLI, Stripe webhooks,
  Firestore, or RTDB. This answers the product contract first and leaves real
  Stripe webhook delivery as a separate external smoke.
- 2026-06-17 Codex: The runtime smoke will authenticate both local roles:
  developer for `/api/ad`, advertiser for `/api/campaigns` and
  `/api/activity/advertiser`. That directly verifies same-email public checkout
  ownership instead of only inspecting `/api/market`.
- 2026-06-17 Codex: The smoke checkout uses a higher CPM than the seeded sample
  campaign so ad selection is deterministic. This does not imply a $5 campaign
  would beat a higher-funded bidder; lower bids can appear in the leaderboard
  while not winning `/api/ad`.

## Implemented Change 2026-06-17

Created `web/scripts/smoke-local-checkout.mjs` with pure response predicates,
summaries, and full runtime orchestration. The script starts local sample web,
creates a mock public advertiser checkout, verifies the purchased campaign in
market ranking, authenticated `/api/ad`, same-email advertiser `/api/campaigns`,
and `/api/activity/advertiser`, then stops the spawned server.

## Verification 2026-06-17

- RED:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- scripts/smoke-local-checkout.test.mjs`
  failed because `smoke-local-checkout.mjs` did not exist.
- GREEN helper tests:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- scripts/smoke-local-checkout.test.mjs`
  passed with 6 tests.
- Runtime smoke:
  `corepack pnpm@9.12.0 smoke:local-checkout` passed and printed checkout,
  market, ad, campaigns, and activity summaries for the purchased campaign.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented and verified local checkout smoke. | Codex |
| 2026-06-17 | Documented implementation decisions before creating the smoke script. | Codex |
| 2026-06-17 | Planned local checkout smoke. | Codex |
