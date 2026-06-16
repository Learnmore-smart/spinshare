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

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Reused shared destination URL safety for click redirects. | Codex |
| 2026-06-15 | Planned shared destination safety validation for click redirects. | Codex |
| 2026-06-15 | Planned tracked click redirect endpoint. | Codex |
| 2026-06-15 | Implemented tracked click redirect endpoint. | Codex |
