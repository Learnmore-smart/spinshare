# advertiser-overview-view.tsx

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Renders the main advertiser dashboard overview: hero, aggregate stats,
campaign builder, and campaign list.

## What It Does

- Reads campaign state and actions from `useAdvertiserDashboard()`.
- Shows advertiser hero messaging and the 3-second minimum viewability badge.
- Computes aggregate campaign budget and telemetry totals.
- Renders zero-value stat cards before campaigns finish loading.
- Renders `CampaignBuilder` and the campaign list/loading/error states.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdvertiserOverviewView` | React component | Main dashboard overview content |

## Dependencies

- Internal: `advertiser-dashboard-context`, `CampaignBuilder`, `CampaignList`,
  dashboard `lib` format/summary helpers.
- External: React `useMemo`, `lucide-react`.

## Important Notes / NEVER Change

- Keep authenticated campaign loading inside the provider/context; this view
  should stay presentational.
- Do not block campaign management if unrelated dashboard panels fail.
- Keep stats zero-safe while data loads.

## Planned Change 2026-06-16

Mount the shared checkout status banner near the top of the advertiser overview
so dashboard Add Funds redirects to
`/dashboard/advertiser?funding=success&checkout_session_id=cs_...` produce a
visible funding/webhook/leaderboard explanation.

The banner must stay hidden for ordinary dashboard visits.

## Implemented Change 2026-06-16

Mounted `CheckoutStatusBanner` below the advertiser dashboard hero. It remains
hidden without checkout/funding query params and reuses the same
`/api/checkout-status` diagnostics as the public homepage.

## Verification 2026-06-16

- RED: `checkout-status-banner.test.tsx` failed because `funding=...` parsed as
  `{ kind: "none" }`.
- GREEN: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/checkout-status-banner.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx`
  passed after parser support and dashboard mount.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Mounted shared checkout status banner in advertiser overview. | Codex |
| 2026-06-16 | Created doc and planned dashboard funding status banner mount. | Codex |
