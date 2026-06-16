# advertiser-activity-feed.tsx

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Advertiser dashboard activity feed component.

## Planned Behavior

- Render loading, error, empty, and ready states.
- Show recent impression attempt outcomes for owned campaigns.
- Keep the feed compact and operational: campaign id, status, duration, and
  developer credit/billing outcome.

## Implemented Behavior

- `AdvertiserActivityFeed` renders loading, error, empty, and ready states.
- Ready rows display campaign id, attempt status, duration, and credit label.
- Credited rows receive counted styling hooks so billable outcomes are visually
  distinct from non-billed attempts.

## Planned Change 2026-06-15 Advertiser Money Events

Render both impression attempts and advertiser money events in the same recent
activity list. Money event rows should show event labels and amount labels
instead of forcing duration/credit semantics onto checkout or funding events.

## Implemented Change 2026-06-15 Advertiser Money Events

The component receives normalized rows from `activity-feed.ts`, so no separate
branching was needed here. Existing row rendering now displays money event
labels and amount labels through the normalized `statusLabel`, `durationLabel`,
and `creditLabel` fields.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx` passed on 2026-06-15.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Confirmed advertiser feed rendering works for money event rows via normalized helpers. | Codex |
| 2026-06-15 | Planned advertiser feed rendering for money events. | Codex |
| 2026-06-15 | Created doc before adding advertiser activity feed component. | Codex |
| 2026-06-15 | Synced implemented advertiser activity feed after green tests. | Codex |
