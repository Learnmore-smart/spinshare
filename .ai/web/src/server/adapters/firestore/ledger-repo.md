# ledger-repo.ts (FirestoreLedgerRepo)

> Protection: STANDARD

## Purpose（一句话人话）

Firestore-backed durable ledger: one document per impression in `ledgerEntries/{entryId}`. Powers the developer dashboard's earnings/chart/activity.

## What It Does

- `appendEntries(entries)`: idempotent durable write keyed by `entryId` (transaction reads then writes only missing docs, so flush retries never double-count).
- `listByDeveloper(developerId)`: returns every entry credited to a developer, in recording order, for the dashboard (Requirements 8.1–8.3).

## Public API

| Name | Type | Description |
|------|------|-------------|
| `FirestoreLedgerRepo` | class (`LedgerRepository`) | Firestore adapter |
| `appendEntries` | method | idempotent durable append |
| `listByDeveloper` | method | list a developer's entries in recording order |

## Dependencies

- **Internal:** `./client` (Firestore client), `./collections` (paths + `toLedgerEntry`), `../../ports/ledger-repository`
- **External:** `firebase-admin/firestore`, `@spinshare/core`

## Important Notes / NEVER Change

- `appendEntries` MUST stay idempotent by `entryId`.
- `listByDeveloper` MUST NOT throw for a developer with zero entries — the dashboard relies on an empty array to render the $0 / empty state.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Developer dashboard shows "Couldn't load your dashboard" even when earnings are $0 | `listByDeveloper` combined `.where("developerId","==",…)` with `.orderBy("createdAt")`, which requires a composite Firestore index. No index is configured, so the query throws `FAILED_PRECONDITION` for every developer; the page catches it and renders the error state. | Query by `developerId` only (single-field index Firestore maintains automatically) and sort by `createdAt` in memory. No composite index required, so empty/any ledgers load successfully and a $0 developer sees the proper empty state. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc; fixed composite-index load error in `listByDeveloper` | Kiro |
