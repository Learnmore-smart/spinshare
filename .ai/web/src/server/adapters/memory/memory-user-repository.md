# memory-user-repository.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

In-memory `UserRepository` implementation for tests and local mock mode.

## What It Does

- Stores users in a process-local map.
- Upserts local/mock identities.
- Applies balance deltas for flush tests.
- Stores Stripe Connect metadata for payout tests.

## Planned Change 2026-06-16

Implement `tryDebitBalanceCents()` with the same contract as Firestore: return
`false` for missing users or insufficient balance, otherwise subtract the
requested amount and return `true`.

## Implemented Change 2026-06-16

`tryDebitBalanceCents()` now returns `false` for missing/insufficient users and
subtracts the amount before returning `true`.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-17 | Parity with the FirestoreUserRepo flush-poison fix. | `applyBalanceDeltaCents` threw on a missing user, which would nack a flush batch. | `applyBalanceDeltaCents` now upserts a minimal user record carrying the delta (identity enriched later by `upsertFromIdentity`). `tryDebitBalanceCents` still returns `false` for missing users. |

## Planned Change 2026-06-20 Canonical Identity

Mirror the Firestore identity mapping exactly: verified email convergence,
provider-account stability, linked-provider metadata, and financial preservation.

Root cause: identity lookup used only `provider:providerAccountId` and generated a
new ID, so one person could receive multiple user documents.

## Implemented Change 2026-06-20 Canonical Identity

The memory adapter now derives first-time canonical IDs from normalized verified
email, maps provider accounts permanently, merges linked providers, and preserves
all money fields on identity refresh.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Documented canonical identity parity plan. | Codex |
| 2026-06-17 | `applyBalanceDeltaCents` upserts a missing user (mirrors FirestoreUserRepo) so reconciliation is self-healing. | Claude |
| 2026-06-16 | Implemented memory atomic payout debit reservation. | Codex |
| 2026-06-16 | Created before adding atomic payout debit reservation. | Codex |
