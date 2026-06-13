# page.tsx

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

This file renders the public SpinShare homepage and polls the live bid market.

## What It Does

- Presents the developer earning proposition with live top-bid and hourly-estimate math.
- Provides role-specific developer and advertiser sign-in/install entry points.
- Polls `GET /api/market` every 15 seconds and renders funded bid rows.
- Shows loading, empty, and temporary-error states without fake campaign data.

## Public API

| Name | Type | Description |
|------|------|-------------|
| HomePage | React component | Public landing page for SpinShare |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| None | N/A | No | App Router page component |

## Dependencies

- External: `next/link` for navigation.
- External: `react` for live market state, polling, and hourly estimate state.
- External: `lucide-react` for UI icons.

## Important Notes / NEVER Change

- Keep developer and advertiser callback URLs distinct.
- Keep the money-forward value proposition visible in the first viewport.
- Keep homepage market values derived from `GET /api/market`, not hardcoded samples.
- Avoid implying source-code upload or intrusive ad behavior.

## Planned Change

Redesign the homepage around the psychology shown in the public reference screenshots:

- Lead with visible earning math, including a monthly/hourly dollar anchor.
- Replace the cold violet SaaS tone with a warmer money-market look: mint surfaces, green accents, black terminal panels, and high-contrast CTAs.
- Show advertiser demand under the CTA through a bid market table and live bid metrics.
- Make install/start actions large and repeated.
- Keep the interactive terminal demo, but make the payoff and ledger credit more immediate.

## Responsive Adjustment

Visual QA found that the hero proof panels and bid table can force horizontal width around tablet-sized viewports. The homepage will stack the hero visual until the `xl` breakpoint, mark grid children as shrinkable, and contain bid-table horizontal scrolling inside the bid panel.

## Implemented Change

- Replaced the cold violet SaaS homepage with a mint-green money-market design.
- Added a black live-bid ticker, large money-forward hero, `$43.44/mo` install anchor, and repeated install CTAs.
- Added visible earning stats, wait-state before/after proof, a live bid market table, and a terminal-style paid wait simulation.
- Added responsive safeguards for the hero proof panels and bid table.

## Revision Plan: Live Data + Simpler Layout

User feedback on 2026-06-13: homepage is too messy, buttons look broken, and market data must self-update rather than use sample rows.

Planned changes:

- Replace hardcoded ticker ads, bid rows, top bid, and monthly estimate with state derived from `GET /api/market`.
- Poll `GET /api/market` periodically so the homepage updates as campaigns change.
- Keep a clear empty state when there are no biddable campaigns instead of fake campaign names.
- Simplify the hero to one primary developer CTA and one compact advertiser CTA.
- Fix CTA layout so labels do not wrap awkwardly or crowd the dollar pill.
- Pass `role=developer` or `role=advertiser` through sign-in links.

## Planned Fix: Complete Live Market Wiring

Verification on 2026-06-13 showed the live-market test direction was not fully implemented: the page still rendered hardcoded sample bids and static `$43.44/mo` copy, and the market route was missing. The page will move to an empty/loading-safe state, poll `GET /api/market`, render live rows when available, and include role query params on developer/advertiser links.

## Implemented Fix: Live Market Homepage

- Removed hardcoded ticker ads, sample bid rows, fake `$43.44/mo` copy, FAQ clutter, and the terminal simulation state.
- Added a simpler money-first hero with live top CPM, estimated developer take per hour, funded bid count, and a waits-per-hour slider.
- Added a responsive install CTA whose live-bid chip moves to a second row on small widths rather than crowding the label.
- Added a live bid market table fed by `/api/market` with loading, empty, and error states.
- Added role query params to developer and advertiser links.

## Verification

- `vitest run src/app/page.test.tsx src/app/api/market/route.test.ts src/app/signin/page.test.ts` passed.
- `next build` passed.
- Playwright visual QA was attempted but blocked by the app usage limit.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Documented money-forward homepage redesign plan before editing code | Codex |
| 2026-06-13 | Documented responsive fixes for hero proof panels and bid table overflow | Codex |
| 2026-06-13 | Synced documentation after homepage money-market redesign and verification | Codex |
| 2026-06-13 | Documented live market data and simplified CTA revision plan | Codex |
| 2026-06-13 | Documented live market wiring completion plan after failing tests | Codex |
| 2026-06-13 | Synced docs with live market homepage implementation and verification | Codex |
