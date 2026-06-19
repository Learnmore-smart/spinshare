# signup-bonus-service.md

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Grants the one-time $1 developer sign-up bonus idempotently: durable ledger row plus immediate `balanceCents` credit.

## What It Does

- `grantSignupBonus(deps, developerId)` — no-op when a `signup_bonus` ledger row already exists; otherwise appends the row and credits 100 cents.
- Called from the developer dashboard layout and device-approval route on authenticated developer flows.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `grantSignupBonus` | function | Idempotent $1 welcome credit |
| `buildSignupBonusEntry` | function | Pure ledger row builder for tests |

## Dependencies

- **Internal:** `ports/ledger-repository`, `ports/user-repository`
- **External:** `@spinshare/core` signup bonus constants

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Added launch $1 signup bonus service | agent |
