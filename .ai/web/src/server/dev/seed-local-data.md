# seed-local-data.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Provisions durable in-memory records for the local test accounts so the dashboards show real data right after sign-in.

## What It Does

- Seeds a durable `User` for each local test account (developer + advertiser).
- Credits the developer account with a deterministic set of `LedgerEntry` records (24 impressions × 18¢ = $4.32), powering the developer dashboard's earnings, chart, and activity rows.
- Seeds one funded, active `Campaign` (id `cmp-local-demo`, $50 budget, $30 CPM) owned by the advertiser account, powering the advertiser dashboard and homepage market panel.
- Operates only on the synchronous in-memory repositories; idempotent via stable ids / `entryId`s.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `SeedableRepos` | interface | The in-memory repos the seeder writes to. |
| `seedLocalTestData` | function | Seeds users, ledger entries, and the demo campaign. |

## Dependencies

- **Internal:** `../adapters/memory` (concrete memory repos), `./test-users` (`LOCAL_TEST_USERS`).
- **External:** `@spinshare/core` — `Campaign`, `LedgerEntry`, `User` types.

## Important Notes / NEVER Change

- Invoked from `container.ts` ONLY when `SPINSHARE_MODE=local` AND `NODE_ENV=development` (the interactive `next dev` server). It must never run under test (Vitest), e2e (`next start`), build, or production, or it will pollute deterministic fixtures / real data.
- Seeded ids MUST match `LOCAL_TEST_USERS` so the session identity lines up with the seeded data.
- Money split stays self-consistent (developer credit + retention === revenue).

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created local data seeder for test accounts. | Kiro |
