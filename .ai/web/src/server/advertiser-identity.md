# advertiser-identity.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Centralizes advertiser identity derivation for public email-first purchases.

## Planned API

| Name | Type | Description |
|------|------|-------------|
| `publicAdvertiserIdForEmail` | Function | Derives the deterministic `public_...` advertiser id used before an advertiser registers. |

## Why

Homepage checkout already uses an email-derived public advertiser id. Dashboard claim logic must use exactly the same algorithm, otherwise a user who purchases first and logs in later with the same email cannot see their campaign.

## Implemented Change

Added `normalizeAdvertiserEmail()` and `publicAdvertiserIdForEmail()`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented shared advertiser identity helper. | Codex |
| 2026-06-15 | Created doc before extracting shared advertiser identity helper. | Codex |
