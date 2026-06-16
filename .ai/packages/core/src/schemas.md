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

## Planned Change

Raise minimum CPM bid from $0.01 to $1.00 (`CPM_CENTS_MIN = 100`). Update UI hints, client validation, and i18n to match.

## Planned Change (2026-06-15 Cumulative Viewability)

Replace the old hard `viewDurationMs >= 3000` validation with a cumulative
tracking contract:

- keep `VIEWABILITY_MIN_MS = 3000` as the settlement threshold
- allow positive short segments below 3000 ms so they can be remembered
- reject missing, zero, negative, non-integer, and non-numeric durations
- let the web route and progress repository decide whether a segment settles or
  remains pending

This matches the product rule: a 1-second view does not bill immediately, but
the next ad fetch should continue the same campaign until cumulative view time
reaches 3 seconds.

## Implemented Change (2026-06-15 Cumulative Viewability)

`VIEWABILITY_MIN_MS` remains the settlement threshold at 3000 ms. The tracking
schema now accepts positive integer segments starting at 1 ms and rejects
missing, zero, negative, fractional, non-numeric, and non-integer durations.
Settlement is now owned by the web route plus the impression progress
repository rather than schema validation.

## Planned Change (2026-06-15 Destination URL Safety)

Harden `destinationUrlSchema` beyond basic HTTPS validation:

- reject URLs with username/password credentials;
- reject `localhost`, `.localhost`, and `.local` hostnames;
- reject IP-literal destinations, including private/local IPs;
- reject custom ports.

This deterministic gate is the first ad-safety layer. LLM or reputation-service
review can be added later, but unsafe URL shapes must fail before campaign
creation or Stripe checkout.

## Implemented Change (2026-06-15 Destination URL Safety)

`destinationUrlSchema` now rejects credentialed URLs, local hostnames, IP
literal destinations, and custom ports after the existing valid-URL and HTTPS
checks. Public homepage checkout and authenticated dashboard campaign creation
inherit the rule through the shared schema.

## Planned Change (2026-06-15 Dashboard Block Funding)

Add a dashboard funding schema that accepts `{ campaignId, blockCount }` instead
of an arbitrary dollar amount. Dashboard funding should mean "buy N blocks of
1,000 impressions for this campaign"; the server derives the checkout amount
from the campaign's stored CPM bid and the requested block count.

## Implemented Change (2026-06-15 Dashboard Block Funding)

Added `fundingBlockCheckoutSchema` and `FundingBlockCheckoutInput`. It validates
`campaignId` plus a whole positive `blockCount` using the same block-count
schema as public homepage checkout.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented dashboard block-based funding schema. | Codex |
| 2026-06-15 | Planned dashboard block-based funding schema. | Codex |
| 2026-06-15 | Implemented deterministic destination URL safety hardening. | Codex |
| 2026-06-15 | Planned deterministic destination URL safety hardening. | Codex |
| 2026-06-15 | Implemented cumulative viewability schema behavior. | Codex |
| 2026-06-14 | Minimum CPM bid raised to $1.00 (`CPM_CENTS_MIN = 100`). | Codex |
| 2026-06-13 | Created doc before adding public advertiser checkout schema. | Codex |
| 2026-06-13 | Synced doc with implemented advertiser checkout schema and amount helper. | Codex |
| 2026-06-13 | Documented 3-second viewability tracking contract before editing schema. | Codex |
| 2026-06-13 | Synced doc with implemented 3-second `viewDurationMs` schema. | Codex |
| 2026-06-15 | Planned cumulative viewability schema behavior. | Codex |
