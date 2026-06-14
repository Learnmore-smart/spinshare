# page.tsx

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

This file renders the public SpinShare homepage and polls the live bid market.

## What It Does

- Presents the developer earning proposition with a money-first hero and monthly estimate.
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

Display "3-second minimum views" on the public homepage so developers and
advertisers see the counting rule before installing or buying traffic.

## Previous Planned Change

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

## Planned Fix: Spacious Sticky Homepage Revamp

User feedback on 2026-06-13:

- Buttons feel broken and crowded in the hero CTA area.
- Navbar does not stay on top while scrolling.
- Homepage is too dense and needs more first-viewport psychology like the public reference in `public/home-page.png`, without copying its brand.
- The dark `How it pays` band creates an abrupt black background.

Fix strategy:

- Make the header `sticky top-0 z-50` with a translucent mint/white surface so it remains above content.
- Rebuild the hero as a centered, spacious first viewport: concise headline, before/after wait-state comparison, one large install pill, and one secondary advertiser link.
- Move dense stats, sliders, and market detail lower so the entry experience sells the idea before asking the user to parse data.
- Replace the black process band with a light mint process section.
- Keep live market data from `GET /api/market`; no fake campaign rows or hardcoded sample advertisers.

## Planned Fix: Money-First Conversion Rewrite

User feedback on 2026-06-13 after visual review:

- The page still reads too much like developer tooling, not money.
- Download/code icons should become money icons, including navbar and lower CTA.
- Hero headline should become:
  - `Your AI thinks`
  - `You get [money icon]`
- Supporting copy must be two short lines:
  - `SpinShare turns idle AI waits into paid moments.`
  - `60% of revenue goes to you.`
- The CTA chip should show a monthly amount only, not `/hr live estimate`.

Follow-up requirement:

- Use `🤑` as the product money icon instead of generic dollar/download/code icons.

Psychology direction from the requested search:

- Lead with the reward and minimize reading load because users scan web pages heavily.
- Use the Fogg motivation/ability/prompt framing: money is the motivation, install is the low-effort ability cue, and the CTA is the prompt.
- Keep proof nearby, but do not let proof text compete with the money cue.

## Implemented Fix: Live Market Homepage

- Removed hardcoded ticker ads, sample bid rows, fake `$43.44/mo` copy, FAQ clutter, and the terminal simulation state.
- Added a simpler money-first hero with live top CPM, estimated developer take per hour, funded bid count, and a waits-per-hour slider.
- Added a responsive install CTA whose live-bid chip moves to a second row on small widths rather than crowding the label.
- Added a live bid market table fed by `/api/market` with loading, empty, and error states.
- Added role query params to developer and advertiser links.

## Implemented Fix: Spacious Money-First Homepage

- Rebuilt the first viewport around the headline `Your AI thinks / You get 🤑`.
- Reduced supporting copy to two short lines, with `60% of revenue goes to you.` highlighted.
- Replaced download/code/dollar glyphs in primary CTAs with the product money icon.
- Changed the CTA estimate chip to monthly `/mo` wording and removed `live estimate`.
- Made the navbar sticky (`sticky top-0 z-50`) so it stays above scrolled content.
- Moved the dense market stats, slider, and bid table below the hero.
- Replaced the abrupt dark process band with a light mint `How it pays` section.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx src/app/signin/page.test.ts` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web build` passed after allowing the configured Google font fetch.
- Playwright loaded `http://127.0.0.1:3003`, confirmed the page rendered, and captured the first viewport.

## Planned Change: Remove Waits-Per-Hour Slider Panel

User feedback on 2026-06-13: remove the left "Paid waits per hour" slider and "Your share" card from the market-depth section. The live bid market table should span the full width of that row.

## Planned Change: Drop Market-Depth Stat Cards + Bottom Spacing

User feedback on 2026-06-13: the three stat cards ("Top CPM", "Monthly take", "Funded bids") in the market-depth header read as redundant and noisy alongside the live bid market card directly below them. Also the bottom "Advertisers can move this market" CTA panel hugs the table with no breathing room.

Planned changes:

- Remove the three liquid-glass stat cards on the right of the market-depth header.
- Restructure the market-depth header so the headline + supporting copy span the full row width, no second column.
- Add vertical spacing between the live bid market card and the "Advertisers can move this market" CTA panel.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|

## Planned Change: Public Advertiser Checkout Form

User feedback on 2026-06-13: the market panel does not make paying obvious enough. Add a native SpinShare-styled form in the market-depth section, inspired by the provided reference, so advertisers can enter email, ad line, destination URL, optional brand metadata, public/private leaderboard preference, CPM bid, and number of 1,000-view blocks. The form posts to a public backend checkout route and redirects to Stripe.

## Implemented Change: Public Advertiser Checkout Form

Mounted `AdvertiserCheckoutForm` in the market-depth section between the live bid market and the advertiser portal CTA. The form preserves the current SpinShare glass/mint UI and makes checkout visible without requiring users to enter the advertiser dashboard first.

## Verification

- Initial page regression failed because the form copy was not rendered.
- Final focused web test run passed for `page.test.tsx`, market route, and advertiser checkout route.
- Full web tests, `tsc --noEmit`, and production build passed.

## Planned Adjustment: Header Blur

Screenshot review on 2026-06-13 showed the fixed navbar still reads too flat at the page edge. Strengthen the outer header backdrop blur so the bar feels layered over scrolling content instead of only the inner glass capsule carrying the effect.

## Planned Adjustment: Remove Header Rule

Screenshot review on 2026-06-13 showed the full-width line under the fixed navbar is visually distracting. Remove the header border line and keep the blur on the navbar backdrop itself.

## Planned Adjustment: Container-Only Header Blur

Follow-up screenshot review clarified the blur should belong to the rounded navbar container, not the whole fixed header section. Move the backdrop treatment from the full-width header wrapper to the inner navbar capsule.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Documented money-forward homepage redesign plan before editing code | Codex |
| 2026-06-13 | Documented responsive fixes for hero proof panels and bid table overflow | Codex |
| 2026-06-13 | Synced documentation after homepage money-market redesign and verification | Codex |
| 2026-06-13 | Documented live market data and simplified CTA revision plan | Codex |
| 2026-06-13 | Documented live market wiring completion plan after failing tests | Codex |
| 2026-06-13 | Synced docs with live market homepage implementation and verification | Codex |
| 2026-06-13 | Documented spacious sticky homepage revamp plan before editing code | Codex |
| 2026-06-13 | Documented money-first homepage rewrite after visual review | Codex |
| 2026-06-13 | Documented requested `🤑` money icon replacement | Codex |
| 2026-06-13 | Synced docs with final spacious money-first homepage implementation and verification | Codex |
| 2026-06-13 | Documented removal of waits-per-hour slider panel before editing code | Codex |
| 2026-06-13 | Documented removal of market-depth stat cards and bottom CTA spacing before editing code | Codex |
| 2026-06-13 | Documented public advertiser checkout form plan before editing code | Codex |
| 2026-06-13 | Synced docs with implemented public advertiser checkout form and verification | Codex |
| 2026-06-13 | Documented navbar border removal and stronger backdrop filter before editing code | Codex |
| 2026-06-13 | Documented moving header blur from full-width wrapper to navbar container | Codex |
| 2026-06-13 | Documented homepage 3-second minimum views copy before editing. | Codex |
| 2026-06-14 | Fix homepage navbar link spacing: increase nav `gap` from `gap-2` to `gap-6` and `text-sm` to match other site pages. | Codex |
