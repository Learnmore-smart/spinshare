# firestore.indexes.json

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Source-of-truth Firestore index manifest for production deployments.

## What It Does

- Explicitly records the current index requirement for the app.
- Provides the file consumed by Firebase CLI for `firestore:indexes` deploys.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `indexes` | array | Composite index definitions. Currently empty because repositories use single-field filters only. |
| `fieldOverrides` | array | Single-field index overrides. Currently empty because no field-level overrides are needed. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| N/A | N/A | N/A | Static Firestore index config. |

## Dependencies

- **Internal:** Firestore repositories in `web/src/server/adapters/firestore/*`.
- **External:** Firebase CLI / Firestore index deployment service.

## Important Notes / NEVER Change

- Only add composite indexes that correspond to real Firestore queries.
- Current production queries are single-field filters (`budgetCents`, `advertiserId`, `developerId`) and document-id operations; Firestore maintains those single-field indexes automatically.
- Do not deploy with `--force` without checking whether the live project has manual indexes that are not represented here.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created explicit empty index manifest after verifying current Firestore query shapes. | Codex |
