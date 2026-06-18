# payout-attempt-repo.ts

> Last updated: 2026-06-16 | Protection: PROTECTED

## Purpose

Firestore-backed payout attempt reconciliation repository.

## What It Does

- Persists attempts under the `payoutAttempts` collection.
- Honors `SPINSHARE_FIRESTORE_NAMESPACE` through shared `COLLECTIONS`.
- Supports record, update, and list-by-developer reads.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Created before adding Firestore payout attempt repository. | Codex |
