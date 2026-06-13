# page.tsx

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Renders the client-side sign-in page for developer and advertiser entry.

## What It Does

- Lets users choose Developer or Advertiser before signing in.
- Starts GitHub, Google, or local mock credentials sign-in through NextAuth.
- Preserves callback URLs so users land on the correct dashboard.
- Supports a role query parameter for role-specific links from the homepage.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `resolveInitialRole` | function | Resolves `role=advertiser` to advertiser; defaults everything else to developer. |
| `SignInPage` | React component | App Router page component. |

## Dependencies

- **Internal:** UI button/card components.
- **External:** `next/navigation`, `next-auth/react`, `next/link`, React, `lucide-react`.

## Important Notes / NEVER Change

- Default to developer when the role query is missing or invalid.
- Keep callback behavior role-specific when no explicit `callbackUrl` exists.
- Do not require real OAuth credentials for local mock sign-in.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Sign-in role tests expected `resolveInitialRole`, but the page did not export or use it. | Role-specific homepage links were added without wiring initial role selection. | Export `resolveInitialRole` and initialize the sign-in role from query params. |

## Verification

- `vitest run src/app/page.test.tsx src/app/api/market/route.test.ts src/app/signin/page.test.ts` passed.
- `next build` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for sign-in role initialization fix. | Codex |
