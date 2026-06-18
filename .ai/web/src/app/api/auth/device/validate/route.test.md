# route.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Regression tests for `GET /api/auth/device/validate`.

## What It Does

- Verifies missing tokens return `401 { valid: false }`.
- Verifies invalid tokens return `401 { valid: false }`.
- Verifies valid mock device tokens return `200 { valid: true }`.

## Agent Decisions / Thoughts

- 2026-06-16 Codex: Tests should prove validation does not require a campaign, because this endpoint is an auth probe, not an ad-serving route.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added validation route tests for valid, missing, invalid, and no telemetry side effects. | Codex |
| 2026-06-16 | Created RED test plan for device-token validation endpoint. | Codex |
