# nextauth-device-provider.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Production auth adapter for device-flow token issuing and validation, backed by
NextAuth browser sessions and HMAC device tokens.

## Current Bug 2026-06-16

`MockAuthProvider.mintToken()` accepts optional claims, but
`NextAuthDeviceProvider.mintToken()` only mints `{ userId }`. The advertiser
dashboard page uses this direct mint helper for its internal bearer token, so it
cannot attach `email` even though `Device_Auth_Token` supports it.

## Fix Plan

- Extend `mintToken(userId, claims?)` to include optional claims, matching the
  mock provider's direct-mint behavior.
- Keep `approveDevice()` unchanged because it already includes `DeviceApproval`
  email/provider/role.

## Implemented Change 2026-06-16

`mintToken(userId, claims?)` now merges optional claims into the signed
`Device_Auth_Token` payload while preserving the explicit `userId` argument.

## Verification

- Add/extend focused auth adapter tests proving direct-minted tokens validate
  with the optional email/role claims.
- Run full root test/lint after the dashboard fix.
- Focused RED/GREEN passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/page.test.tsx src/server/adapters/auth/nextauth-device-provider.test.ts src/app/api/campaigns/route.test.ts`.
- Full regression passed:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented optional claims in direct-minted production device tokens. | Codex |
| 2026-06-16 | Documented direct-mint optional claims fix plan. | Codex |
