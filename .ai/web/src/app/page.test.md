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

## Planned Change

Create the failing regression/conversion test before replacing the homepage so the redesign is pinned to earning math, install CTA visibility, and bid market proof.

## Test Harness Adjustment

Vitest renders the Next page outside the Next compiler path, so JSX emitted from the imported page expects a global `React` binding. The test will provide that binding before rendering so failures reflect homepage content, not the test transform.
The React import uses a namespace import so it does not depend on `esModuleInterop` when TypeScript is invoked outside the package script.

## Implemented Test

The test renders `HomePage` to static markup and verifies that the page starts in a live-market loading state, exposes the install CTA and bid market, includes role-specific links, and no longer includes sample campaign names or `$43.44/mo`.

## Revision Plan

Tests should no longer require static sample money like `$43.44/mo`. They should verify:

- The homepage starts in a live-market loading/empty-safe state.
- Developer and advertiser links include the correct `role` query param.
- The page references live market data rather than sample bid rows.

## Planned Fix

The test is already red against the current homepage because the implementation still renders static sample bids and `$43.44/mo`. Keep the test intent and update the homepage to satisfy it.

## Verification

- Initial live-market assertion failed while the homepage still rendered sample bids and `$43.44/mo`.
- After implementation, `vitest run src/app/page.test.tsx src/app/api/market/route.test.ts src/app/signin/page.test.ts` passed.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for homepage content test before adding it | Codex |
| 2026-06-13 | Documented React global harness adjustment for server-rendered page test | Codex |
| 2026-06-13 | Synced documentation with final homepage content test and red/green result | Codex |
| 2026-06-13 | Documented namespace React import for TypeScript invocation robustness | Codex |
| 2026-06-13 | Documented revised test direction for live market homepage | Codex |
| 2026-06-13 | Documented failing live-market homepage test before implementation fix | Codex |
| 2026-06-13 | Synced homepage test docs with final live-market assertions | Codex |
