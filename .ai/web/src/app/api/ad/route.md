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

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned aggregate show tracking and click redirect URL rewriting. | Codex |
| 2026-06-15 | Implemented show tracking and click URL rewriting. | Codex |
