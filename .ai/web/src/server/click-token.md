# click-token.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Mint and verify short-lived signed tokens for campaign click telemetry.

## What It Does

- Signs a payload containing `campaignId`, `developerId`, issued-at, and expiry
  with HMAC-SHA256.
- Verifies token format, signature, campaign binding, and expiry.
- Lets `/api/click` distinguish links actually issued by `/api/ad` from arbitrary
  `campaignId` replay attempts.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `mintClickToken` | function | Create a signed click token for a served ad. |
| `verifyClickToken` | function | Return the token payload when valid for a campaign, otherwise null. |

## Dependencies

- External: Node `crypto` for HMAC and timing-safe signature comparison.
- Environment: `AUTH_SECRET` when set; local development can use the same
  clearly-labeled fallback pattern as device tokens.

## Agent Decisions / Thoughts

- 2026-06-16 Codex: Click tokens should not require browser auth headers because
  terminal OSC8 links open in the system browser. The token is proof that the
  link came from a recently served ad, not a user identity credential.
- 2026-06-16 Codex: The default token TTL is 24 hours. It is intentionally
  longer than a terminal click window but short enough to limit replay value.

## Important Notes / NEVER Change

- Never accept arbitrary redirect targets from the token; `/api/click` must keep
  resolving destination URLs from stored campaign data.
- Missing or invalid tokens should not break redirect click-through, only
  telemetry counting.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-16 | Click metrics can be inflated by replaying `/api/click?campaignId=...`. | Click endpoint had no proof that the ad was served. | Add signed click token minted by `/api/ad` and required for counting. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented HMAC click token mint/verify helper. | Codex |
| 2026-06-16 | Planned signed click token helper. | Codex |
