# page.tsx

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Server route for `/dashboard/advertiser`; it reads the browser session, mints a
short-lived dashboard bearer token, and passes it to the client dashboard.

## Current Bug 2026-06-16

Homepage checkout creates campaigns under a public advertiser id derived from
the purchase email. `/api/campaigns` can claim those campaigns only when the
dashboard bearer token includes the authenticated user's email claim.

The current page mints the token with only `userId`, so a logged-in advertiser
whose email matches the purchase email still cannot see the homepage checkout
campaign in the dashboard.

## Fix Plan

- Preserve the existing user id fallback.
- Include `session.user.email` in the minted token claims when present.
- Keep this server-page-only; do not change campaign ownership rules.

## Implemented Change 2026-06-16

`mintAdvertiserToken()` now passes optional `{ email, role: "advertiser" }`
claims into the provider. The page supplies `session.user.email`, so
`/api/campaigns` can claim homepage purchases made with the same email.

## Verification

- Add a failing page-level test that proves the dashboard token includes email
  and advertiser role claims from the session.
- Run focused advertiser dashboard/page tests, then full root test/lint.
- Focused RED/GREEN passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/page.test.tsx src/server/adapters/auth/nextauth-device-provider.test.ts src/app/api/campaigns/route.test.ts`.
- Full regression passed:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented email/advertiser claims in dashboard token minting. | Codex |
| 2026-06-16 | Documented homepage checkout claim bug and token-claim fix plan. | Codex |
