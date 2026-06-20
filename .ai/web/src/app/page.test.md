# page.test.tsx

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

This file verifies that the public homepage keeps money-forward conversion content visible.

## What It Does

- Renders the App Router homepage to static markup.
- Checks that the page exposes earning math, install CTA copy, and advertiser bid proof.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Homepage content tests | Vitest tests | Guardrails for homepage conversion copy |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| None | N/A | No | Test file |

## Dependencies

- External: `vitest` for assertions.
- External: `react-dom/server` for static rendering.
- Internal: `./page` for the homepage component.

## Important Notes / NEVER Change

- Tests should assert user-visible behavior, not implementation details.
- Keep test copy aligned with the money-forward homepage strategy.

## Planned Regression: Reference Layout Spine

Before changing the homepage layout, add a static-render regression that requires
the new reference-inspired section structure without coupling to colors or exact
visual styling:

- A centered homepage frame class wraps the main content.
- The first viewport uses a split hero layout with a right-side visual/proof rail.
- The wait-state before/after comparison is grouped in a process panel.
- The market proof area uses a two-column layout for the narrative and chart.
- The lower proof cards render in a compact row.

## Implemented Regression: Reference Layout Content

The final static-render test keeps the regression focused on durable visible
content instead of brittle visual classes:

- The page still renders the money-first hero, role-specific links, checkout
  affordances, process copy, and 3-second minimum viewability proof.
- The test was run red first with missing layout hooks, then passed after the
  homepage and CSS changes.

## Planned Change

Add a failing homepage copy assertion for "3-second minimum views" before
editing the page.

## Previous Planned Change

Create the failing regression/conversion test before replacing the homepage so the redesign is pinned to earning math, install CTA visibility, and bid market proof.

## Test Harness Adjustment

Vitest renders the Next page outside the Next compiler path, so JSX emitted from the imported page expects a global `React` binding. The test will provide that binding before rendering so failures reflect homepage content, not the test transform.
The React import uses a namespace import so it does not depend on `esModuleInterop` when TypeScript is invoked outside the package script.

## Implemented Test

The test renders `HomePage` to static markup and verifies that the page starts in a live-market loading state, exposes the `Your AI thinks / You get` money-first hero, renders the accessible `🤑` money icon, uses monthly `/mo` copy, includes role-specific links, keeps the sticky header classes, and no longer includes sample campaign names, `$43.44/mo`, `live estimate`, or the abrupt black process band.

## Revision Plan

Tests should no longer require static sample money like `$43.44/mo`. They should verify:

- The homepage starts in a live-market loading/empty-safe state.
- Developer and advertiser links include the correct `role` query param.
- The page references live market data rather than sample bid rows.

## Planned Fix

The test is already red against the current homepage because the implementation still renders static sample bids and `$43.44/mo`. Keep the test intent and update the homepage to satisfy it.

## Planned Regression: Sticky Spacious Homepage

Add static-render assertions before implementation that require:

- The header exposes sticky top positioning and a high z-index.
- The first viewport includes the new centered before/after wait-state proof copy.
- The page exposes a lighter market-depth section.
- The old abrupt black `bg-[#111815]` process band is gone.

## Planned Regression: Money-First Hero

Update the static homepage test before implementation so it requires:

- `Your AI thinks` and `You get` in the headline.
- A money-icon accessible label in the hero.
- The product money icon renders as `🤑`.
- A monthly CTA chip containing `/mo`.
- No `live estimate` phrasing.
- The concise revenue line `60% of revenue goes to you.`

## Verification

- Initial live-market assertion failed while the homepage still rendered sample bids and `$43.44/mo`.
- After implementation, `vitest run src/app/page.test.tsx src/app/api/market/route.test.ts src/app/signin/page.test.ts` passed.
- Final focused run: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx src/app/signin/page.test.ts` passed.

## Bug Fix: Stale Signup Bonus Banner Copy (2026-06-20)

**Discovered**: CI fails on `page.test.tsx` because the static-render test still expects
`Limited Time: Get $1 instantly when you sign up!` while `dictionaries.ts` now defines
`home.signupBonusBanner` as `New users get a $1 gift — our treat. (Limited time)`

**Root Cause**: Homepage copy was updated in i18n; the regression test was not synced.

**Fix Strategy**: Update the test assertion to match current `signupBonusBanner` copy.
Keep the page/i18n copy as source of truth.

**Impact**: `web/src/app/page.test.tsx` only.

**Test Plan**: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx`

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-20 | Homepage test fails on signup bonus banner | Test expected retired `Limited Time: Get $1 instantly when you sign up!` copy | Assert current `New users get a $1 gift — our treat.` banner from i18n |
| 2026-06-15 | Full web suite fails on stale homepage layout class assertions | Test still expected old reference-layout class names that current homepage no longer renders, despite the test contract saying to assert user-visible behavior | Remove implementation-class assertions and keep copy/link/visible-section assertions. |

## Planned Regression: Checkout Return Status Banner (2026-06-16)

Update the static homepage test before mounting the banner so the checkout
section includes the status component's durable copy. Keep the assertion
copy-level and avoid depending on client-side URL state in this page test; the
component's own test covers URL parsing and status copy.

## Implemented Regression: Checkout Return Status Banner (2026-06-16)

No extra static homepage assertion was added because the banner intentionally
renders `null` for ordinary homepage visits. Page coverage is limited to
ensuring the homepage still statically renders after importing the client
component; behavior coverage lives in `checkout-status-banner.test.tsx`.

## Planned Regression: Public Advertiser Checkout Form

Update the static homepage test before implementation so it requires visible advertiser checkout affordances: email, destination URL, public leaderboard toggle copy, and Stripe checkout CTA. The test should remain copy-level and not depend on client interaction.

## Implemented Regression: Public Advertiser Checkout Form

The homepage static-render test now requires the public checkout headline, email field label, destination URL label, public leaderboard toggle copy, and Stripe checkout CTA.

## Planned Regression 2026-06-20: Delivery Column

Require the localized Delivery heading in ordinary static homepage markup. The
focused progress component test owns row-level counts and ARIA behavior because
the homepage has no market rows before its client fetch resolves.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned public market Delivery heading regression. | Codex |
| 2026-06-20 | Synced signup bonus banner assertion with current i18n `signupBonusBanner` copy | Agent |
| 2026-06-16 | Documented why checkout banner behavior is covered by the component test, not static homepage copy. | Codex |
| 2026-06-16 | Planned homepage regression for checkout return status banner copy. | Codex |
| 2026-06-15 | Synced homepage layout regression notes with final visible-content assertions and red/green run | Codex |
| 2026-06-15 | Removed stale homepage layout class assertions and kept visible content/link assertions | Codex |
| 2026-06-15 | Planned removal of stale homepage layout class assertions from the static render test | Codex |
| 2026-06-15 | Documented reference-layout static regression before editing homepage code | Codex |
| 2026-06-13 | Created documentation for homepage content test before adding it | Codex |
| 2026-06-13 | Documented React global harness adjustment for server-rendered page test | Codex |
| 2026-06-13 | Synced documentation with final homepage content test and red/green result | Codex |
| 2026-06-13 | Documented namespace React import for TypeScript invocation robustness | Codex |
| 2026-06-13 | Documented revised test direction for live market homepage | Codex |
| 2026-06-13 | Documented failing live-market homepage test before implementation fix | Codex |
| 2026-06-13 | Synced homepage test docs with final live-market assertions | Codex |
| 2026-06-13 | Documented sticky/spacious homepage regression assertions before editing tests | Codex |
| 2026-06-13 | Documented money-first hero regression assertions before editing tests | Codex |
| 2026-06-13 | Documented `🤑` money icon regression assertion | Codex |
| 2026-06-13 | Synced final homepage regression test docs with sticky, monthly, and money-icon assertions | Codex |
| 2026-06-13 | Documented 3-second minimum views homepage copy regression before editing tests. | Codex |
