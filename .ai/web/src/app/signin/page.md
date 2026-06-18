# page.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Planned Change: OAuth-Only Sign-In Panel

User request on 2026-06-14: remove the email/password block from the sign-in card (the "or" divider, email field, password field, and green submit button). Keep role tabs and Google/GitHub OAuth only — same behavior on localhost and production.

Fix strategy:

- Delete credentials form UI, related state, and `handleCredentialsSignIn` from `SignInForm`.
- Keep OAuth handlers, role selection, callback URLs, and inline OAuth error display.
- Do not remove the NextAuth Credentials provider from the server; only hide the client form.

## Purpose

Renders the client-side sign-in page for developer and advertiser entry.

## What It Does

- Lets users choose Developer or Advertiser before signing in.
- Offers OAuth-only sign-in via GitHub and Google.
- Surfaces inline OAuth errors when provider sign-in fails.
- Preserves callback URLs so users land on the correct dashboard.
- Uses a clean split sign-in layout with marketing copy on the left and the auth panel on the right.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `resolveInitialRole` | function | Resolves `role=advertiser` to advertiser; defaults everything else to developer. |
| `SIGNIN_PAGE_COPY` | object | Shared sign-in page copy used by tests and visible layout. |
| `SignInPage` | React component | App Router page component. |

## Dependencies

- **Internal:** UI button/card components.
- **External:** `next/navigation`, `next-auth/react`, `next/link`, React, `lucide-react`.

## Important Notes / NEVER Change

- Default to developer when the role query is missing or invalid.
- Keep callback behavior role-specific when no explicit `callbackUrl` exists.
- Credentials sign-in must validate against defined accounts only 鈥?never accept
  an arbitrary id. The provider is local-only (off in production).
- Keep the sign-in page focused on account access; do not add fake account creation actions that are not wired.
- Keep the money icon as a restrained product cue, not a dense full-page background.

## Bug Fix Plan 2026-06-16 Local Sample Credentials Entry

Bug: `dev:sample` intentionally runs with `AUTH_MODE=mock` and seeded local
data, but the sign-in UI is OAuth-only. Without Google/GitHub credentials, the
extension opens `/activate`, redirects to `/signin`, and the user has no visible
way to create the browser session required to approve the device flow. That
makes local VSIX/sample ads look broken even when the backend has sample ads.

Root cause: the server still registers the local NextAuth Credentials provider,
but the client removed the credentials entry point for all environments.

Fix strategy:

- Keep production OAuth-only.
- Add a local-only credentials shortcut controlled by
  `NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS=1`.
- Use the fixed local developer/advertiser test accounts only; do not accept
  arbitrary ids or passwords from the browser.
- Reuse `signIn("credentials", { email, password, callbackUrl })` so this goes
  through the real NextAuth credentials provider and creates the same browser
  session `/activate` needs.
- Set this flag in `dev:sample` so local VSIX testing has a complete auth path.

## Bug Fix Implemented 2026-06-16 Local Sample Credentials Entry

Added `localCredentialsEnabledFromEnv()` and
`localTestCredentialsForRole()`. When
`NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS=1`, the sign-in panel shows a compact
local test-account section for the selected role and calls
`signIn("credentials", { email, password, callbackUrl })` with the fixed local
developer/advertiser test account. Production remains OAuth-only by default.

## Bug Fix Plan 2026-06-16 Advertiser Callback Role

Bug: visiting `/dashboard/advertiser` while signed out redirects through
NextAuth with `callbackUrl=/dashboard/advertiser`, but no `role=advertiser`
query. The sign-in page therefore initializes as Developer, which is confusing
for advertisers who just bought a campaign and then open the advertiser
dashboard.

Root cause: `resolveInitialRole()` only reads the explicit `role` query param
and ignores the callback destination.

Fix strategy:

- Preserve explicit `role=advertiser` and `role=developer` when present.
- When role is missing, infer advertiser from a `callbackUrl` whose pathname is
  `/dashboard/advertiser` or below it.
- Keep the default as developer for unknown callbacks and invalid roles.

## Bug Fix Implemented 2026-06-16 Advertiser Callback Role

`resolveInitialRole()` now honors explicit `role=advertiser` and
`role=developer` first. When role is missing, it parses `callbackUrl` and
selects advertiser for `/dashboard/advertiser` and nested advertiser dashboard
paths. Unknown callbacks still default to developer.

## Planned Change: Clean Split Sign-In Page

User correction on 2026-06-13: the requested clean reference should apply to the sign-up/sign-in page, not the public homepage.

Planned changes:

- Replace the centered single auth container with a split first viewport.
- Put large balance-focused text on the left: `Sign in to see your SpinShare balance.`
- Keep the right-side auth panel dedicated to role selection, OAuth, and email/password sign-in.
- Remove the dense moving money-stream background and keep the money emoji as a small badge/CTA cue.
- Preserve role query parsing, callback behavior, OAuth handlers, credentials sign-in, local test-account helper, and back-to-home navigation.

## Implemented Change: Clean Split Sign-In Page

- Replaced the centered auth card over moving money streams with a split layout.
- Added large left-side copy: `Sign in to see your SpinShare balance.`
- Added a focused right-side auth panel labeled `Start with SpinShare`.
- Kept developer/advertiser role selection, Google/GitHub OAuth, email/password sign-in, local test account prefill, and callback handling.
- Kept the money emoji as a small badge/CTA cue instead of a dense page background.

## Verification: Clean Split Sign-In Page

- Red: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/signin/page.test.ts` failed before implementation because `SIGNIN_PAGE_COPY` was missing.
- Green: the same focused sign-in test passed after implementation.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed after implementation.

## Planned Enhancement: Stronger 3D Sign-In Container

User feedback on 2026-06-14: the sign-in form container should have a better 3D effect.

Fix strategy:

- Replace the inline auth panel surface classes with the shared `.spinshare-signin-card` class.
- Keep the form layout, inputs, role tabs, OAuth buttons, and callback behavior unchanged.
- Move the visual depth into `theme.css` so the panel can use layered glass, bevel, and shadow effects without adding extra DOM.

## Implemented Enhancement: Stronger 3D Sign-In Container

- Replaced the auth panel's inline glass, border, and shadow utilities with the shared `.spinshare-signin-card` class.
- Preserved the sign-in page layout, role switcher, OAuth buttons, credentials form, local account helper, and callback behavior.
- Verified the rendered page still includes the intended panel class at `/signin?role=developer`.

## Verification: Stronger 3D Sign-In Container

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/signin/page.test.ts` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- Local dev server returned `200` for `/signin?role=developer` and the response included `.spinshare-signin-card`.
- Browser screenshot smoke check confirmed the auth card renders with the stronger raised glass effect and no obvious control overlap.

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

- Use `馃` as the repeated money icon in the stream rows.

## Planned Adjustment: Sign-In Glass Layout

User feedback on 2026-06-13: the sign-up/sign-in page white auth container should show a stronger backdrop-filter glass treatment, and the "Back to home" control should move to the top-left in its own 3D glass container.

Fix strategy:

- Keep the money-stream background behind all sign-in controls.
- Move the home link out of the centered form column into an absolutely positioned top-left button.
- Apply a dedicated sign-in card glass class so the white container visibly blurs and catches the background.
- Give the top-left home button the same elevated liquid-glass visual language.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx src/app/signin/page.test.ts` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web build` passed after allowing the configured Google font fetch.
- Playwright loaded `/signin?role=developer` and confirmed the dense money-stream rows are present behind the form.

## Copy Correction: Per-Impression, Not Per-Second

User correction on 2026-06-14: sign-in marketing copy must not claim payment for every second of AI thinking. SpinShare pays per ad impression that stays visible for at least 3 seconds.

Fix: update `web/src/lib/i18n/dictionaries.ts` `signin.body` in all locales.

## Planned Change: Denser Neutral Sign-In (2026-06-14)

User feedback: increase information density on the entry page, reduce AI-stylized icons, and use colorless frosted glass (no green tint in blur surfaces).

Fix strategy:

- Tighten left-column typography and spacing so more product facts fit above the fold.
- Add a compact two-column bullet list under the stat cards (share %, min view, no upload, IDE support).
- Remove decorative role-tab icons (`Code`, `Layers`) and the unused money emoji helper.
- Replace green-tinted glass gradients on the auth card, stat tiles, and back button with neutral white `backdrop-filter` only.
- Soften the page background to a neutral gradient without emerald radial washes.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented advertiser callback role inference. | Codex |
| 2026-06-16 | Planned advertiser callback role inference. | Codex |
| 2026-06-16 | Implemented local-only credentials shortcut for sample/dev sign-in. | Codex |
| 2026-06-16 | Planned local-only credentials shortcut for sample/dev sign-in. | Codex |
| 2026-06-14 | Denser left column, neutral glass, no role-tab icons. | Auto |
| 2026-06-14 | Removed email/password form from sign-in card; OAuth-only panel. | Auto |
| 2026-06-14 | Corrected sign-in body copy to describe 3-second ad impressions instead of per-second AI thinking. | Codex |
| 2026-06-13 | Created documentation for sign-in role initialization fix. | Codex |
| 2026-06-13 | Documented diagonal money-stream sign-in enhancement before editing code. | Codex |
| 2026-06-13 | Documented requested `馃` stream icon replacement. | Codex |
| 2026-06-13 | Replaced the "type any id" mock box with an official email/password form validated against defined local test accounts; implemented `MONEY_STREAM_ROWS` background. | Kiro |
| 2026-06-13 | Documented requested sign-in card backdrop and top-left 3D home button adjustment. | Codex |
| 2026-06-13 | Documented clean split sign-in page redesign before editing code. | Codex |
| 2026-06-13 | Synced docs with final `馃` money stream, ASCII form helper cleanup, and verification. | Codex |
| 2026-06-13 | Synced docs with clean split sign-in implementation and verification. | Codex |
| 2026-06-14 | Documented stronger 3D auth container enhancement before editing code. | Codex |
| 2026-06-14 | Synced docs with stronger 3D auth container implementation and verification. | Codex |
