# route.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Authenticated advertiser campaign management API.

## Planned Change

Enrich `GET /api/campaigns` responses with aggregate campaign telemetry for the
advertiser dashboard:

- shows
- clicks
- credited impressions
- non-credit reason buckets

Every campaign should receive a zero-filled telemetry object when it has no
activity.

## Constraints

- Only return campaigns owned by the authenticated advertiser.
- Telemetry must remain aggregate and campaign-scoped.
- Do not expose prompts, user content, or private user identifiers.

## Implemented Change

`GET /api/campaigns` now returns zero-filled telemetry for each owned campaign,
merging durable ledger impression counts into the `credited` total.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned advertiser campaign telemetry response fields. | Codex |
| 2026-06-15 | Implemented advertiser campaign telemetry enrichment. | Codex |
