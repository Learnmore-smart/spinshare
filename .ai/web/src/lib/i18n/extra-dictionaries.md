# extra-dictionaries.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Extended localized copy for dashboards, setup guide, activation, advertiser dashboard, and validation errors.

## What It Does

- Supplies locale-specific strings merged into the base dictionaries.
- Keeps setup-guide and dashboard copy out of page components.
- Provides function-valued strings for dynamic amounts, counts, and labels.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `extraEn` | Constant | English extended dictionary. |
| `extraZh` | Constant | Chinese extended dictionary. |
| `extraFr` | Constant | French extended dictionary. |
| `mergeExtra` | Function | Merges base and extra dictionaries. |

## Dependencies

- Internal: `Dictionary` type.

## Important Notes / NEVER Change

- Keep keys aligned with `types.ts`.
- Do not hardcode setup-guide strings in React components when a dictionary key exists.

## Planned Change

Clarify extension auto-wrap and CLI device-flow setup copy. The guide should say that extension auto-wrap affects new integrated terminals, and that CLI login approval is the `/activate` device-flow approval, not a separate wakeup feature.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Created doc and documented setup copy clarification. | Codex |
