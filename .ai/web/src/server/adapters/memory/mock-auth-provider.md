# mock-auth-provider.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Local/test AuthProvider implementation for device-flow and bearer token validation.

## Planned Change

Allow tests to mint mock tokens with optional claims such as email. The production device token already carries email claims; mock auth should mirror that so route tests can exercise email-based campaign claim behavior.

## Constraints

- Keep existing `mintToken(userId)` behavior compatible.
- Do not introduce persistence or network dependencies.

## Implemented Change

`mintToken(userId, claims?)` now stores full `AuthClaims`; `validateToken()` returns a copy of those claims.

## Bug Fix Plan 2026-06-17 Device Approval Email Claim Dropped

Bug: `approveDeviceByUserCode(userCode, { userId, email })` receives the
browser session email from `/api/auth/device/approve`, but the mock provider
currently delegates to `approveDevice(deviceCode, userId)` and drops the email.

Impact: local/mock device tokens lack `claims.email`, so same-email public
advertiser checkout ownership cannot be resolved by `/api/campaigns` or
`/api/activity/advertiser`. This made `smoke:local-checkout` fail after market
and `/api/ad` succeeded.

Fix strategy: preserve optional approval claims when minting the access token
from `approveDeviceByUserCode`, while keeping direct `approveDevice(deviceCode,
userId)` behavior compatible.

## Implemented Fix 2026-06-17 Device Approval Claims

`approveDeviceByUserCode` now mints the token with optional `email`, `provider`,
and `role` claims from the browser approval and stores that token on the
approved device record. Direct `approveDevice(deviceCode, userId)` remains the
legacy claim-light test helper.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Preserved optional device approval claims in mock auth tokens. | Codex |
| 2026-06-17 | Planned fix for dropped email claim during mock device approval. | Codex |
| 2026-06-15 | Implemented optional mock token claims. | Codex |
| 2026-06-15 | Planned optional mock token claims for email claim tests. | Codex |
