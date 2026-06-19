# page.tsx

> Last updated: 2026-06-18 | Protection: STANDARD

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

## Planned Change (2026-06-15 - Lower Earning Counter Frequency)

Reduce the update frequency of the simulated live earnings counter (`liveEarnings`) to avoid UI distraction:
- Increase the interval from 150ms to 2000ms.
- Scale up the increment step from `0.01 + Math.random() * 0.02` to `0.15 + Math.random() * 0.25` to maintain the same average rate of accumulation (~$0.13 - $0.14 per second).

## Planned Change (2026-06-15)

Adapt the homepage to the friend's recommended layout structure without copying
the screenshot's color treatment or UI chrome:

- Keep the existing SpinShare brand palette, glass components, copy, auth links,
  market polling, bid chart, and public advertiser checkout form.
- Add a centered landing-page frame so the page reads as a narrow vertical spine
  rather than disconnected full-width bands.
- Rebuild the hero as a two-column layout on desktop: money-first copy and CTAs
  on the left, a compact wait-state product visual with live earning card on the
  right. Stack cleanly on mobile.
- Group the Claude-vs-SpinShare before/after demo inside one process panel with
  a centered heading, arrow, and wide install summary bar below it.
- Reframe the market-depth section as a two-column proof area: left narrative and
  live advertiser list, right live CPM chart/table module.
- Keep the "how it pays" proof cards compact at the bottom of the spine.

## Implemented Change (2026-06-15)

- Added a centered `spinshare-home-frame` main layout so the landing page reads
  as a narrower vertical spine.
- Converted the hero into a desktop grid with money-first copy and CTAs on the
  left and the wait-state comparison panel on the right, stacking on smaller
  screens.
- Grouped the Claude-vs-SpinShare comparison with `spinshare-process-panel` and
  kept the existing animated loading state.
- Changed the market section container to `spinshare-market-proof-grid`, adding
  a compact live-bid preview list on the left while preserving the existing live
  chart, table, advertiser checkout form, and advertiser portal CTA.
- Added `spinshare-proof-card-row` to keep the lower proof cards aligned.
- Increased live earnings counter interval to 2000ms with scaled increments.

## Verification (2026-06-15)

- Red test confirmed `page.test.tsx` failed before layout hooks existed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx`
  passed after implementation.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- A later fresh rerun after documentation sync failed because local dependency
  links were missing (`web/node_modules` only contained `.vite`; packages such
  as `vitest`, `next`, and `lucide-react` were not resolvable). Offline pnpm
  relink failed on uncached `@vscode/vsce` metadata, and network install
  approval was rejected by the app usage limit.
- Browser visual QA was attempted but blocked by local dev-server launch issues:
  PowerShell `Start-Process` hit a Windows `Path`/`PATH` environment collision,
  and the Node runtime spawn path was rejected by the app usage limit.

## Planned Change (2026-06-14)

Navbar polish:

- Center the three section anchor links (`#money`, `#bid-market`, `#how-it-pays`) with even horizontal spacing (absolute center in the glass bar).
- Remove signed-in email from `SiteNavAuth` — keep Dashboard + Sign out on landing only.

## Previous Planned Change

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
- The monthly chip animates via `liveEarnings`: each 333ms tick adds `0.015 + random * 0.03` (roughly half the prior step size) so the fake counter climbs more slowly.

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
| 2026-06-14 | Hero highlight text clipped at top | `.spinshare-home-hero { overflow: hidden }` in `home.css` | Remove `overflow: hidden` from hero section |

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

## Planned Change (2026-06-14)

Restore bid-market timeline chart without fake multipliers:

- Re-add the Recharts area chart and 24H/ALL toggles between the market header and table.
- Build chart points from client-side poll history (`topCpmCents` snapshots on each `GET /api/market` refresh), persisted in `sessionStorage` for the current browser session.
- Show an honest empty chart state when no bid history exists yet; do not restore fabricated fleet imps/min badge.

## Planned Change (2026-06-14)

Restore impressions column with real served/target values from `GET /api/market` instead of remaining budget.

## Implemented Change (2026-06-14)

- Restored bid timeline chart from live poll snapshots (`sessionStorage`), not fake multipliers.
- Restored impressions column with `served / target` text and progress bar using `servedImpressions` and `targetImpressions` from `GET /api/market`.

## Implemented Change (2026-06-14)

- Deleted fake CPM history chart, 24H/ALL toggles, and fabricated fleet imps/min badge.
- Top CPM now shows `$0.00` when no live bids (was `$11.00`).
- Table fourth column shows each row's real `remainingBudgetUsd` instead of hash-based impression progress bars.

## Planned Change (2026-06-14)

- Footer `liquid-glass` panel: add `spinshare-static` so it does not animate on hover.

## Planned Change (2026-06-14)

Bid table fourth column: remove progress dot/bar; show total amount the advertiser funded (remaining budget + served spend).

## Implemented Change (2026-06-14)

- Bid table fourth column shows total funded amount (`remaining + served spend`); progress dot/bar removed.

## Planned Change (2026-06-14)

Add fifth bid-table column after total paid: served/target label (e.g. `24/1.7k`) plus progress bar.

## Implemented Change (2026-06-14)

- Fifth column shows impression delivery (`served/target` + progress bar) after total paid.

## Bug Fix: Impressions Label Clipped (2026-06-14)

**Discovered**: 2026-06-14
**Description**: Bid table impressions cell shows `served / target` (e.g. `24 / 1.7k`) with the right side cut off because the label uses a fixed `w-16` (64px) width inside a 200px column.
**Fix plan**: Remove fixed width; use `shrink-0 whitespace-nowrap` on the label and widen the impressions grid column slightly so the progress bar still fits.

## Implemented Change (2026-06-14)

- Impressions label no longer uses fixed `w-16`; grid impressions column uses `minmax(220px, 1fr)`.

## Bug Fix: Bid Market Chart Axis Overlap (2026-06-14)

**Discovered**: 2026-06-14
**Description**: Y-axis dollar labels on the bid-market area chart are cramped, and the bottom `$0.00` tick overlaps the first X-axis timestamp.
**Root Cause**: `AreaChart` used `margin.left: -20` and `margin.bottom: 0`, squeezing Y-axis labels into the plot and leaving no room below the X-axis. No explicit `YAxis` width or tick margins.
**Fix Strategy**:
- Use positive chart margins (`left: 0`, `bottom: 12`, modest `top`/`right`).
- Set `YAxis` `width={54}`, `tickMargin={6}`, and `tickCount={5}`.
- Add `XAxis` `tickMargin` and `minTickGap` so timestamps do not collide with Y labels.
- Slightly increase chart container height and vertical padding between header and plot.

## Planned Change (2026-06-14)

Bid-market header timeframe: swap bespoke button group for shared `SegmentSlider` with new `mini` size.

## Bug Fix: Bid Market Chart Empty Right Side (2026-06-14)

**Discovered**: 2026-06-14
**Description**: With only one or few poll snapshots, the bid chart plotted a lone point in the middle and left the right half of the plot blank.
**Root Cause**: `buildBidChartData` returned only raw snapshot rows on a categorical `time` X-axis, so Recharts had no domain spanning the selected 24H/ALL window.
**Fix Strategy**:
- Pad chart samples with window-start and window-end anchors using the first/last known bid.
- Store `atMs` on each point and drive `XAxis` with `type="number"` + fixed `[windowStartMs, windowEndMs]` domain.

## Bug Fix: Top Earners Sparkline Type Safety (2026-06-16)

**Discovered**: 2026-06-16
**Description**: Web typecheck failed because `Sparkline` read
`points[points.length - 1].y`, which can be `undefined` under strict indexed
access.
**Fix:** Keep hooks at the top of the component, return `null` for fewer than
two data points, and use a checked `lastPoint` before rendering the endpoint
circle.

## Planned Change: Homepage Checkout Return Status (2026-06-16)

Stripe redirects public advertiser checkout back to the homepage with
`checkout=success` and `checkout_session_id=cs_...`, but the homepage does not
currently read those parameters. That makes a paid advertiser think the ad was
lost when the webhook is still pending, failed, or the campaign is funded but
not leaderboard-eligible.

Mount a small checkout status banner near the public advertiser checkout form.
The banner should:

- stay hidden for normal homepage visits;
- show cancelled checkout copy for `checkout=cancelled`;
- call `/api/checkout-status?checkout_session_id=...` after a successful
  redirect;
- distinguish `pending_webhook`, `funded`, `unknown`, and malformed-session
  states;
- explain whether the campaign is eligible for the public leaderboard without
  exposing advertiser email or authenticated identity.

## Planned Fix 2026-06-17: Immediate Market Refresh After Checkout Funding

Problem: the homepage polls `/api/market` every 15 seconds. When the checkout
status banner reconciles a paid session to `funded`, the market list may still
show the previous response until the next poll. This is especially confusing
after a $5 test checkout because the user expects the leaderboard to update
immediately.

Fix plan:

- Import the checkout-funded browser event from `checkout-status-banner`.
- Listen for that event inside the existing market polling effect.
- Reuse the existing `loadMarket()` function rather than adding another fetch
  path.
- Keep market data derived only from `/api/market`; do not add local fake rows
  or optimistic campaign objects.

## Implemented Change: Homepage Checkout Return Status (2026-06-16)

Mounted `CheckoutStatusBanner` near the top of the `#bid-market` section. This
keeps ordinary homepage visits unchanged because the banner returns `null`
without checkout query params, but after Stripe redirects to
`/?checkout=success&checkout_session_id=cs_...#bid-market`, the user sees a
visible status explanation close to the landing anchor.

## Implemented Fix 2026-06-17: Immediate Market Refresh After Checkout Funding

The homepage now imports `CHECKOUT_FUNDED_MARKET_REFRESH_EVENT` and listens for
it inside the existing market polling effect. When the checkout status banner
confirms that a Stripe session funded a campaign, the homepage immediately
reuses `loadMarket()` so the public leaderboard can show the newly biddable ad
without waiting for the next scheduled 15-second poll.

## Planned Change 2026-06-17: Market Section Row Layout

User feedback: the homepage market section is too column-heavy and should read
as a row. Reuse the existing `spinshare-market-proof-grid` hook so the live
market module and advertiser checkout form sit side by side on desktop, then
stack on smaller screens. Keep the advertiser CTA full-width below both panels.

## Implemented Change 2026-06-17: Market Section Row Layout

Wrapped the live market module, advertiser checkout form, and advertiser CTA in
`spinshare-market-proof-grid`. The live market and checkout form now occupy a
desktop row, while the CTA spans both columns underneath.

## Verification (2026-06-16)

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/checkout-status-banner.test.tsx src/app/page.test.tsx`
  passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Verification (2026-06-17)

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx src/app/checkout-status-banner.test.tsx`
  passed.
- Related payment/leaderboard verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/checkout-status/route.test.ts src/app/api/market/route.test.ts src/app/api/campaigns/route.test.ts src/app/checkout-status-banner.test.tsx src/app/page.test.tsx`
  with 5 files / 25 tests.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- Follow-up row-layout verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx src/app/dashboard/advertiser/campaign-list.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx`.

## Implemented Change 2026-06-19: Public bid table privacy (rank + CPM only)

The homepage bid table columns are now `#`, campaign name, and CPM. `总付款`, `已展示 /
已购买`, progress bars, and any LIVE status badge are removed. Hero fleet impressions use
`summary.totalServedImpressions` from `/api/market` instead of summing per-row served counts.

## Bug Fix 2026-06-18: Total Paid / Purchased Drift

**Discovered**: 2026-06-18
**Description**: The bid table showed "$4.95 / 991" for a campaign funded with
$5.00 for 1,000 views.
**Root Cause**: `computeCampaignTotalPaidCents` (now removed) and the
`served/target` label both derived from the whole-cent `remainingBudgetCents`,
which drifts a few cents low after the flush rounds each impression's sub-cent
spend to whole cents.
**Fix**: Removed the local reconstruction. The table now renders the server's
`row.totalPaidCents` and the block-snapped `row.targetImpressions` from
`GET /api/market` (backed by core `reconstructCampaignDelivery`), so a $5.00 /
1,000-view buy reads as `$5.00` / `1k`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Public bid table shows rank + CPM only; removed total paid, delivery, and LIVE status. | Cursor |
| 2026-06-18 | Bid table uses server `totalPaidCents` + block-snapped `targetImpressions`; removed drifting local total-paid reconstruction. | Cursor |
| 2026-06-17 | Implemented market section row layout around live market, checkout form, and CTA. | Codex |
| 2026-06-17 | Planned market section row layout using the existing proof grid hook. | Codex |
| 2026-06-17 | Implemented immediate market refresh after checkout funding. | Codex |
| 2026-06-17 | Planned immediate market refresh after checkout funding. | Codex |
| 2026-06-16 | Mounted checkout return status banner in the homepage market section. | Codex |
| 2026-06-16 | Planned homepage checkout return status banner. | Codex |
| 2026-06-16 | Fixed Top Earners Sparkline strict indexed access typecheck failure | Codex |
| 2026-06-15 | Reduce live earnings increment frequency to 2000ms and scale up steps | Antigravity |
| 2026-06-15 | Implemented friend-reference layout spine, split hero, process panel, and market proof grid | Codex |
| 2026-06-15 | Planned friend-reference layout adaptation while preserving SpinShare styling and live data | Codex |
| 2026-06-14 | Bid chart spans full timeframe when history is sparse (padded anchors + numeric X domain) | Cursor |
| 2026-06-14 | Homepage dark mode: `spinshare-home*` classes consume `theme.css` tokens; removed hardcoded `#e8f6ed` backgrounds | Cursor |
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

## Implemented Change (2026-06-19)

- Top marquee always renders; empty market shows `No bids yet` + `SpinShare - Get paid when your AI thinks`.
- Production LearnX campaigns removed via `delete-prod-learnx-campaign.mjs --production`.

## Planned Change (2026-06-19 — Ticker brand + centering)

User request:

1. Vertically center ticker content in the top bar.
2. Replace CPM price pill with **brand name**, then show **ad copy** (`adText`).

Implementation:

- Extend homepage `MarketRow` with optional `brandName` from `GET /api/market`.
- Ticker segment layout: `[brand pill] [adText] |` (same pill styling, brand label instead of `bidLabel`).
- Empty market: brand `SpinShare`, tagline-only `tickerNoBidsText`.
- Fallback brand when missing: first word of `adText`.

## Implemented Change (2026-06-19 — Ticker centering + speed)

- Wrap marquee track in `flex justify-center` so overflow clips evenly and content reads centered.
- Slow marquee animation from 30s to 50s per loop.
