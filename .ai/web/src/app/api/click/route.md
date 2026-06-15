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
- Campaigns without an HTTPS destination should not increment clicks and should
  redirect to the site root.

## Implemented Change

Added `GET /api/click`, which resolves the campaign destination server-side,
increments aggregate `clicks`, and redirects only to stored HTTPS destinations.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned tracked click redirect endpoint. | Codex |
| 2026-06-15 | Implemented tracked click redirect endpoint. | Codex |
