# ad-controller.property.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Property tests for the VS Code extension ad controller impression invariant.

## What It Does

- Generates arbitrary start/complete lifecycles.
- Compares observed notifications and impressions to an independent model.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Property 24 | Fast-check property | One impression per eligible displayed ad. |

## Dependencies

- External: `vitest`, `fast-check`.
- Internal: `./ad-controller`.

## Important Notes / NEVER Change

- The model should account for active/starting idempotency.
- No-ad states must continue to report zero impressions.

## Planned Change

Update the property wording and model so an impression is counted only after a
displayed ad remains active for the 3000 ms minimum.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before updating VS Code property tests for viewability. | Codex |
