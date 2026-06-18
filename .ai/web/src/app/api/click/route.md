# route.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tracked click redirect endpoint for campaign destination URLs.

## Planned Design

`GET /api/click?campaignId=...` loads the campaign server-side, increments the
aggregate campaign `clicks` counter, and redirects to the campaign's stored
HTTPS destination URL.

## Constraints

- No user prompt, raw request content, or private user identifier is stored.
- Do not accept arbitrary target URLs from the request.
- Campaigns without a safe public HTTPS destination should not increment clicks
  and should redirect to the site root.

## Planned Change 2026-06-15 Destination Safety Reuse

Reuse the shared `destinationUrlSchema` when redirecting clicks. Creation-time
validation protects new ads, but the click endpoint also needs to protect users
from historical/manual campaign records that contain unsafe HTTPS-looking URLs
such as `https://localhost/`, credentialed URLs, IP literals, or custom ports.

## Implemented Change 2026-06-15 Destination Safety Reuse

`GET /api/click` now validates stored campaign destinations through
`destinationUrlSchema` before redirecting or counting a click. Unsafe historical
destinations fall back to the site root and do not increment `clicks`.

## Implemented Change

Added `GET /api/click`, which resolves the campaign destination server-side,
increments aggregate `clicks`, and redirects only to stored HTTPS destinations.

## Planned Change 2026-06-16 Signed Click Telemetry

Root cause: the endpoint currently counts any request with a valid `campaignId`
as a click. Because the URL is public once rendered in a terminal, campaign ids
can be replayed manually or by bots and pollute advertiser dashboard click
metrics.

Fix plan: require a valid signed click token for telemetry counting. The token
is minted by `/api/ad`, bound to the served campaign and developer, and carried
as a query parameter on the `/api/click` URL. Missing or invalid tokens should
still redirect to the stored destination so old links and user click-through do
not break, but they must not increment `clicks`.

Regression risk: do not turn this into an authenticated browser route; terminal
OSC8 clicks open in a browser without the Device_Auth_Token header.

## Implemented Change 2026-06-16 Signed Click Telemetry

`GET /api/click` now reads `clickToken` and increments `clicks` only when
`verifyClickToken()` validates the token for the requested campaign. Missing or
invalid tokens still redirect to the stored safe destination but do not count
telemetry.

## Dependencies

- `web/src/server/click-token.ts`
- `destinationUrlSchema`
- campaign repository and campaign telemetry counters

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Verification 2026-06-16 Signed Click Telemetry

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/track/route.test.ts src/app/api/ad/route.test.ts src/app/api/click/route.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/market/route.test.ts src/app/api/campaigns/route.test.ts src/app/api/checkout-status/route.test.ts src/app/api/payouts/status/route.test.ts src/app/api/payouts/withdraw/route.test.ts src/app/api/payouts/connect/route.test.ts` passed with 42 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented signed click telemetry token verification. | Codex |
| 2026-06-16 | Planned signed click telemetry token. | Codex |
| 2026-06-15 | Reused shared destination URL safety for click redirects. | Codex |
| 2026-06-15 | Planned shared destination safety validation for click redirects. | Codex |
| 2026-06-15 | Planned tracked click redirect endpoint. | Codex |
| 2026-06-15 | Implemented tracked click redirect endpoint. | Codex |
