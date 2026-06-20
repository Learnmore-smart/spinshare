# web/src/app/dashboard/developer/layout.test.tsx

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Regression tests for the developer dashboard server layout.

## What It Does

- Verifies the dashboard mints a developer token from the browser session.
- Verifies pending impression work is flushed before durable ledger entries are
  read for the earnings summary.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `DeveloperDashboardLayout` tests | Vitest suite | Covers dashboard data-load ordering. |

## Dependencies

- **Internal:** mocked `auth`.
- **Internal:** mocked `getContainer`.
- **Internal:** mocked `flushPendingForRead`.

## Agent Decisions / Thoughts

- **2026-06-16 Codex:** This route is the primary user-visible balance surface,
  so it should be covered separately from the payout status API.
- **2026-06-16 Codex:** RED failed because the layout did not call
  `flushPendingForRead`. GREEN passed with 1 test after layout wiring.

## Important Notes / NEVER Change

- Keep this as a server-layout behavior test; detailed summary math belongs in
  `summarize-ledger` tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added RED/GREEN verification notes. | Codex |
| 2026-06-16 | Created planned layout test documentation before writing RED test. | Codex |

## Planned Coverage 2026-06-20 Welcome Gift Activity Wiring

Add RED coverage proving a timestamped signup-bonus ledger row is passed to the
client activity provider as one pinned `welcome_gift` source with its stable id
and $1 amount.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned layout-to-activity-provider welcome-gift coverage. | Codex |
