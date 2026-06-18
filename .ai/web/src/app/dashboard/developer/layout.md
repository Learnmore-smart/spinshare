# layout.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Shared developer dashboard layout: auth gate, ledger fetch, `DeveloperDashboardProvider`, `DashboardShell`.

## Child routes

- `page.tsx` — overview (balance, stats, caps, payout)
- `earnings/page.tsx` — earnings chart
- `activity/page.tsx` — activity table
- `settings/page.tsx` — theme, locale, account, sign out

## Error handling

Ledger load failure renders `DeveloperDashboardError` (no provider/shell children).

## Planned Change 2026-06-15

Load both credited ledger entries and attempt-level activity rows. Keep earnings
summary based on credited ledger entries; pass normalized attempt rows to the
developer dashboard context for the Activity page.

## Implemented Change 2026-06-16

Runs a best-effort one-cycle pending flush before reading
`container.ledger.listByDeveloper(developerId)`. This makes the dashboard more
likely to reflect impressions that were just credited by `/api/track`, while
still allowing the dashboard to render stale durable data if the flush fails.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented best-effort flush before developer ledger read. | Codex |
| 2026-06-16 | Planned best-effort flush before developer ledger read. | Codex |
| 2026-06-15 | Planned attempt-level activity context loading. | Codex |
