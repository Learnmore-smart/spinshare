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

## Planned Change 2026-06-15

Support email-first advertiser claim: when the authenticated token includes an email, `GET /api/campaigns` should include campaigns owned by the deterministic public advertiser id for that email in addition to campaigns owned directly by `claims.userId`.

## Implemented Change 2026-06-15

`GET /api/campaigns` now resolves full auth claims. When the token includes an email, it also lists campaigns owned by `publicAdvertiserIdForEmail(email)`, de-duplicates by campaign id, and returns the same telemetry-enriched view.

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
| 2026-06-15 | Implemented email-based claim for public checkout campaigns. | Codex |
| 2026-06-15 | Planned email-based claim for public homepage purchases. | Codex |
| 2026-06-15 | Planned advertiser campaign telemetry response fields. | Codex |
| 2026-06-15 | Implemented advertiser campaign telemetry enrichment. | Codex |
