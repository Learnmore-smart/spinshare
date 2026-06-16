# nextauth-device-provider.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Unit tests for signed device tokens and the production NextAuth-backed device
auth provider.

## Planned Test 2026-06-16

Add a regression test proving `NextAuthDeviceProvider.mintToken()` can carry
optional claims such as `email` and `role`, matching mock-provider behavior and
supporting homepage checkout claim in the advertiser dashboard.

## Implemented Test

The test direct-mints a token with `email` and `role: "advertiser"` and verifies
`validateToken()` returns those claims.

## Verification

- Red: focused run failed because validated claims only contained `userId`.
- Green: focused run passed after direct mint preserved optional claims.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented direct-mint optional claims regression test. | Codex |
| 2026-06-16 | Planned direct-mint optional claims regression test. | Codex |
