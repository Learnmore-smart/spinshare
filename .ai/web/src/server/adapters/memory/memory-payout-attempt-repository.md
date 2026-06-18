# memory-payout-attempt-repository.ts

> Last updated: 2026-06-16 | Protection: PROTECTED

## Purpose

In-memory implementation of `PayoutAttemptRepository` for tests and local mock
mode.

## What It Does

- Stores payout attempts by `attemptId`.
- Supports idempotent `record`, merge-style `update`, and `listByDeveloper`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Created before adding memory payout attempt repository. | Codex |
