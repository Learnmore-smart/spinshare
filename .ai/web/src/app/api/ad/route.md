# route.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

HTTP adapter for `GET /api/ad`, the ad-selection endpoint used by clients.

## Planned Change

When a campaign is selected, increment the campaign's aggregate `shows` counter
and return a tracked redirect URL for clickable ads. The ad response must still
degrade to `{ adAvailable: false }` when no ad is available.

## Constraints

- Do not store prompts, request content, IP addresses, or user identifiers.
- Click tracking must not expose an open redirect; redirects resolve the
  campaign destination from server-side campaign data.
- Keep ad selection latency bounded by the existing service behavior.

## Implemented Change

Successful ad selections now increment aggregate `shows`. Clickable
destinations are rewritten to the same-origin `/api/click?campaignId=...`
redirect endpoint.

## Planned Change 2026-06-16 Signed Click Token

Root cause: `/api/click?campaignId=...` currently increments click telemetry
for any request that names a valid campaign with a destination. That keeps the
redirect server-side and avoids open redirects, but it lets anyone who knows a
campaign id inflate advertiser click metrics without having been served the ad.

Fix plan: when authenticated `/api/ad` returns a clickable campaign, add a
short-lived HMAC click token to the `/api/click` URL. The token should be bound
to the served campaign id and authenticated developer id. `/api/click` will
still redirect to the stored destination when the token is missing/invalid, but
it should only increment `clicks` when the token verifies.

Regression risk: terminal clickability must remain unchanged because the URL
still points at `/api/click`; only telemetry counting becomes stricter.

## Implemented Change 2026-06-16 Signed Click Token

Authenticated clickable ad responses now append a signed `clickToken` to the
same-origin `/api/click` URL. The token is minted with the served campaign id and
authenticated developer id, so `/api/click` can count only links actually issued
by `/api/ad`.

## Planned Change 2026-06-15 Cumulative Viewability

Read an optional bearer token from `GET /api/ad`. When valid, resolve the
developer id and ask the bidding service to prefer any pending cumulative
viewability progress before normal bidding. Invalid/missing tokens should keep
the current anonymous bidding behavior.

## Implemented Change 2026-06-15 Cumulative Viewability

`GET /api/ad` now extracts an optional bearer token and validates it through the
configured auth provider. Valid developer tokens are passed to the bidding
service along with the progress repository, so pending cumulative viewability
can return the same campaign before normal bidding. Missing or invalid tokens
continue to use anonymous normal bidding.

## Planned Change 2026-06-15 Auth Boundary

Change `/api/ad` from optional-auth to required-auth. Missing or invalid bearer
tokens should return `401` before bidding, before pending-progress selection,
and before incrementing campaign `shows`.

Root cause: optional anonymous bidding made sense for early demos, but it now
conflicts with the product model where extension/npm login syncs the account,
telemetry is tied to a real developer, and every displayed ad must be
attributable before it is served.

## Implemented Change 2026-06-15 Auth Boundary

`GET` now requires a non-empty bearer token and valid auth claims before calling
`selectAd`. Missing or invalid tokens return `{ error: "Unauthorized" }` with
status `401`, so no campaign is selected and `shows` is not incremented.

## Planned Change 2026-06-15 Served Marker

When authenticated `/api/ad` returns an ad, write a 0ms pending progress record
for that developer/campaign before incrementing `shows`. This records the
server-side fact that the campaign was actually served to that developer.

The track route will use that marker to reject arbitrary `campaignId` tracking
requests. If marker creation fails, the route should fail rather than serve an
untrackable paid ad.

## Implemented Change 2026-06-15 Served Marker

Authenticated ad selections now call `progress.addDuration(...)` with
`viewDurationMs: 0` before `shows` telemetry. The marker is keyed by developer
and selected campaign, and preserves existing cumulative duration when the same
pending campaign is re-served.

## Verification 2026-06-15 Served Marker

- Red: focused ad/track route tests failed because `/api/ad` left no progress
  marker and `/api/track` accepted unserved campaigns.
- Green: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/ad/route.test.ts src/app/api/track/route.test.ts` passed with 10 tests.
- Full web regression passed: `corepack pnpm@9.12.0 --filter @spinshare/web test`.
- Full root regression and lint/typecheck passed: `corepack pnpm@9.12.0 test`
  and `corepack pnpm@9.12.0 lint`.

## Verification 2026-06-15 Auth Boundary

- Red: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/ad/route.test.ts` failed because missing/invalid tokens returned `200`.
- Green: the same focused route test passed with 4 tests after the auth guard.
- Full web regression passed: `corepack pnpm@9.12.0 --filter @spinshare/web test`.

## Verification

- Focused cumulative viewability web run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-impression-progress-repository.test.ts src/server/bidding-service.test.ts src/app/api/ad/route.test.ts src/app/api/track/route.test.ts`.
- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented signed click token on served ad URLs. | Codex |
| 2026-06-16 | Planned signed click token on served ad URLs. | Codex |
| 2026-06-15 | Implemented server-side served marker on ad selection. | Codex |
| 2026-06-15 | Planned server-side served marker on ad selection. | Codex |
| 2026-06-15 | Implemented required auth boundary for ad serving. | Codex |
| 2026-06-15 | Planned required auth boundary for ad serving. | Codex |
| 2026-06-15 | Implemented authenticated pending-progress ad selection. | Codex |
| 2026-06-15 | Planned authenticated pending-progress ad selection. | Codex |
| 2026-06-15 | Planned aggregate show tracking and click redirect URL rewriting. | Codex |
| 2026-06-15 | Implemented show tracking and click URL rewriting. | Codex |
