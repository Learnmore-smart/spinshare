# payout-attempt-repository.ts

> Last updated: 2026-06-16 | Protection: PROTECTED

## Purpose

Port for durable payout attempt reconciliation records.

## What It Does

- Defines `PayoutAttempt` and `PayoutAttemptRepository`.
- Tracks withdrawal lifecycle state independently of user-facing activity rows:
  `pending`, `paid`, `failed`, and `blocked`.
- Stores amount, developer id, Stripe Connect account id, provider event/request
  id, provider status, provider code, and timestamps.

## Important Notes

- This is the provider/accounting reconciliation layer, not the dashboard
  activity feed.
- Money-moving code should create a pending attempt before calling the payout
  provider, then update it after success/failure/blocking.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Created before adding payout attempt repository port. | Codex |
