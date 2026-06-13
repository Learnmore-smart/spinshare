# page.tsx

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Renders the client-side sign-in page for developer and advertiser entry.

## What It Does

- Lets users choose Developer or Advertiser before signing in.
- Offers an official sign-in: GitHub/Google OAuth plus an email + password form.
- The email/password form validates against the fixed local test accounts
  (`web/src/server/dev/test-users.ts`) via the NextAuth Credentials provider;
  there is no longer a "type any user id" mock box.
- Shows the local test account for the selected role with a "Use this account"
  prefill button, clearly labelled as local-only.
- Surfaces an inline error on bad credentials (`redirect: false` flow).
- Preserves callback URLs so users land on the correct dashboard.
- Renders a decorative, `aria-hidden` diagonal money-stream background.
- Uses plain ASCII helper text in the password placeholder and local test account line to avoid encoding glitches in the sign-in form.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `resolveInitialRole` | function | Resolves `role=advertiser` to advertiser; defaults everything else to developer. |
| `MONEY_STREAM_ROWS` | `MoneyStreamRow[]` | Precomputed ambient background rows (≥8 rows, ≥12 glyphs each, alternating direction). |
| `SignInPage` | React component | App Router page component. |

## Dependencies

- **Internal:** UI button/card components.
- **External:** `next/navigation`, `next-auth/react`, `next/link`, React, `lucide-react`.

## Important Notes / NEVER Change

- Default to developer when the role query is missing or invalid.
- Keep callback behavior role-specific when no explicit `callbackUrl` exists.
- Credentials sign-in must validate against defined accounts only — never accept
  an arbitrary id. The provider is local-only (off in production).
- Keep the money-stream background non-interactive (`aria-hidden`).

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Sign-in role tests expected `resolveInitialRole`, but the page did not export or use it. | Role-specific homepage links were added without wiring initial role selection. | Export `resolveInitialRole` and initialize the sign-in role from query params. |

## Planned Enhancement: Diagonal Money Streams

User feedback on 2026-06-13: the sign-in page should have many diagonal lines filled with moving money icons. Rows should continuously animate in alternating directions instead of only showing one sparse line up and one line down.

Fix strategy:

- Export a small `MONEY_STREAM_ROWS` configuration for testable row count/direction.
- Render a full-screen decorative money-stream field behind the sign-in card.
- Use repeated money icons per row with duplicated tracks so motion loops continuously.
- Keep the field non-interactive and `aria-hidden` so sign-in controls remain usable.

Follow-up requirement:

- Use `🤑` as the repeated money icon in the stream rows.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx src/app/signin/page.test.ts` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web build` passed after allowing the configured Google font fetch.
- Playwright loaded `/signin?role=developer` and confirmed the dense money-stream rows are present behind the form.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for sign-in role initialization fix. | Codex |
| 2026-06-13 | Documented diagonal money-stream sign-in enhancement before editing code. | Codex |
| 2026-06-13 | Documented requested `🤑` stream icon replacement. | Codex |
| 2026-06-13 | Replaced the "type any id" mock box with an official email/password form validated against defined local test accounts; implemented `MONEY_STREAM_ROWS` background. | Kiro |
| 2026-06-13 | Synced docs with final `🤑` money stream, ASCII form helper cleanup, and verification. | Codex |
