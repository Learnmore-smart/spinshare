# advertiser-dashboard.css

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Styles for the advertiser dashboard shell, panels, campaign cards, and form fields.

## Planned Change (2026-06-14)

- Add `.adv-dash-submit-btn` with amber box-shadow matching the rail logo treatment.
- Set `.adv-dash-panel { overflow: visible; }` so bottom shadows are not clipped.

## Planned Change (2026-06-15)

- Add compact telemetry grid/row styles for always-visible advertiser dashboard
  stat containers and per-campaign diagnostic counters.

## Implemented Change (2026-06-15)

Added compact campaign telemetry and diagnostics row styles with responsive
grid behavior and tabular numeric formatting.

## Planned Change (2026-06-15 Activity UI)

Add compact activity feed row/status styles for advertiser dashboard attempt
activity.

## Implemented Change (2026-06-15 Activity UI)

Added activity feed body, empty, list, row, campaign id, metadata, status, and
credit styles. Credited rows have distinct success color hooks while non-billed
attempts stay muted.

## Planned Change 2026-06-17 Dashboard Light Theme + Fixed Rail

User feedback on the advertiser dashboard screenshots:

- The sidebar moves during page scrolling; on desktop it should stay fixed to
  the viewport.
- Light theme still shows the advertiser hero as a dark slab; default light mode
  should use an amber-tinted light surface, keeping the dark slab only in
  `.dark`.
- Campaign cards need a progress bar and a compact row layout that scales to
  multiple ads.

Plan:

- Make `.adv-dash-rail` fixed on desktop and offset `.adv-dash-main` by the rail
  width; keep the current fixed bottom nav behavior on mobile.
- Split default and `.dark` hero styles so light mode is actually light.
- Add campaign delivery/progress/buy-side-panel styles.

## Implemented Change 2026-06-17 Dashboard Light Theme + Fixed Rail

The desktop rail is fixed to the viewport and the main content is offset by the
rail width. The advertiser hero now defaults to a light amber surface, with the
dark slab scoped to `.dark`. Campaign cards use a desktop row grid with a
delivery progress bar and a side purchase panel.

## Planned Change 2026-06-18 Advertiser Orange Visibility Polish

User feedback on the advertiser dashboard screenshot:

- Active campaign status still shows a green border/dot; it should follow the
  advertiser orange theme.
- Form inputs and buy controls show a green/teal-looking border or focus state;
  local dashboard overrides should make those borders and rings amber.
- The top stat cards have a hover lift/border change the user circled and wants
  removed.
- Orange fills in the hero, top stats, campaign sections, empty states, and
  shadows feel too heavy and should be toned down while keeping the dashboard
  recognizably orange.

Plan:

- Lower amber alpha values in the dashboard theme tokens and hero/stat/campaign
  surfaces.
- Add scoped `.adv-dash .spinshare-input` overrides for visible neutral/amber
  borders, focus rings, placeholder color, and file input trigger styling.
- Replace green active status styles with amber border/background/text/dot.
- Remove the hover transform/border change from `.adv-dash-stat`.

## Implemented Change 2026-06-18 Advertiser Orange Visibility Polish

The advertiser dashboard now uses softer amber variables and lower-alpha hero,
stat, campaign, empty-state, and shadow treatments. Dashboard-scoped
`.spinshare-input` rules override the global emerald input tokens with amber
borders and focus rings. Active campaign and counted activity status styles no
longer use green; they use amber borders, backgrounds, text, dots, and shadows.
The top stat cards explicitly disable transitions and keep identical border,
background, and transform values on hover.

## Planned Change 2026-06-18 Detail Card Revamp

Add styles for the responsive campaign detail-card grid, edit form, destination
URL rows, review banners, unfunded CTA block, buy-time CPM fields, stats page,
and the `needsLink` status badge. Keep the operational dashboard dense and
scannable, not a marketing layout.

## Implemented Change 2026-06-18 Detail Card Revamp

Added responsive campaign detail-card, edit-form, destination, review banner,
unfunded, buy-time CPM, stats-page, and `needsLink` status badge/dot styles.

## Verification (2026-06-18)

- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/advertiser-dashboard.test.tsx src/app/dashboard/advertiser/campaign-list.test.tsx` passed.
- Authenticated local Chrome render of `http://localhost:3000/dashboard/advertiser`
  confirmed the dashboard loads, inputs compute amber borders, stat cards have
  `transition: none`, stat card hover leaves border/background/transform
  unchanged, and active status badge/dot styles compute to amber values.

## Verification (2026-06-17)

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx src/app/dashboard/advertiser/campaign-list.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web dev` reached Ready on `http://localhost:3000`; browser screenshot verification was blocked by the app tool usage limit.

## Verification (2026-06-15)

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented campaign detail-card, stats, and needs-link styles. | Codex |
| 2026-06-18 | Planned campaign detail-card, stats, and needs-link styles. | Codex |
| 2026-06-18 | Implemented advertiser orange visibility polish and verified rendered styles. | Codex |
| 2026-06-18 | Planned advertiser orange visibility polish and green accent removal. | Codex |
| 2026-06-17 | Implemented fixed rail, light hero, and compact campaign card styles. | Codex |
| 2026-06-17 | Planned fixed rail, light hero, and compact campaign card styles. | Codex |
| 2026-06-14 | Submit button shadow + panel overflow fix. | Codex |
| 2026-06-15 | Planned advertiser activity feed styles. | Codex |
| 2026-06-15 | Implemented advertiser activity feed styles. | Codex |
