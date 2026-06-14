# schemas.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Centralizes runtime validation for SpinShare API request bodies and shared money bounds.

## What It Does

- Validates ad text, CPM bids, funding amounts, and tracking requests.
- Exports shared bounds for UI validation and tests.
- Keeps API routes and client-side forms aligned on the same constraints.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `createCampaignSchema` | Zod schema | Authenticated campaign creation payload. |
| `fundingAmountSchema` | Zod schema | Campaign funding checkout payload. |
| `trackRequestSchema` | Zod schema | Impression tracking payload. |

## Dependencies

- External: `zod` for schema validation.

## Important Notes / NEVER Change

- Preserve integer-cent money validation.
- Keep ad text bounds aligned with the visible 60-character form counter.
- Public checkout validation must reject malformed URLs and invalid funding totals before Stripe is called.

## Planned Change

Add the 3-second ad viewability rule to the shared tracking contract:

- export a `VIEWABILITY_MIN_MS` constant set to `3000`
- require `viewDurationMs` in `trackRequestSchema`
- reject tracking payloads whose duration is below 3000 ms
- keep `campaignId` validation unchanged

This makes backend validation reject direct early impression calls while the CLI
and VS Code extension avoid sending those calls in the first place.

## Previous Planned Change

Add `advertiserCheckoutSchema` for the public homepage form:

- email, ad line, HTTPS destination URL, optional brand name, optional small image data URL
- public leaderboard toggle
- CPM bid in cents and block count
- derived total must stay within the existing funding amount bounds

## Implemented Change

Added public advertiser checkout validation for email, HTTPS destination URL, optional brand metadata, leaderboard visibility, CPM cents, and block count. Added `getAdvertiserCheckoutAmountCents()` to derive the Stripe checkout amount as `cpmCents * blockCount`.

## Implemented Change: 3-Second Viewability

Added `VIEWABILITY_MIN_MS = 3000` and required `viewDurationMs` in
`trackRequestSchema`. Tracking payloads below 3000 ms, missing the field, or
using non-integer durations now fail validation before backend ledger logic.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding public advertiser checkout schema. | Codex |
| 2026-06-13 | Synced doc with implemented advertiser checkout schema and amount helper. | Codex |
| 2026-06-13 | Documented 3-second viewability tracking contract before editing schema. | Codex |
| 2026-06-13 | Synced doc with implemented 3-second `viewDurationMs` schema. | Codex |
