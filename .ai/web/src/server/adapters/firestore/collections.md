# collections.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Centralizes Firestore collection names and document-to-domain mappers.

## What It Does

- Names Firestore collections used by the app.
- Converts Firestore document data into core domain types.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `COLLECTIONS` | Constant | Firestore collection path map. |
| `toCampaign` | Function | Maps campaign document data into a `Campaign`. |

## Dependencies

- Internal: `@spinshare/core` type declarations.

## Important Notes / NEVER Change

- Keep mapper defaults backward-compatible with existing Firestore documents.
- Do not perform network I/O in mapper functions.

## Planned Change

Map optional public checkout metadata from campaign documents, defaulting `publicOnLeaderboard` to true for older campaigns.

## Implemented Change

`toCampaign()` maps optional public checkout fields and treats missing `publicOnLeaderboard` as public.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before extending campaign document mapping. | Codex |
| 2026-06-13 | Synced doc with campaign metadata mapper defaults. | Codex |
