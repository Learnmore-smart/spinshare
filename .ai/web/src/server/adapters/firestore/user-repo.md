# user-repo.ts

> Last updated: 2026-06-16 | Protection: PROTECTED

## Purpose

Firestore-backed implementation of `UserRepository`.

## What It Does

- Stores users in the configured Firestore users collection.
- Uses deterministic ids for OAuth identities.
- Uses Firestore transactions for balance and Connect metadata mutations.

## Planned Change 2026-06-16

Implement `tryDebitBalanceCents()` as a Firestore transaction: read the user,
return `false` if missing or if `balanceCents < amountCents`, otherwise update
with `FieldValue.increment(-amountCents)` and return `true`.

## Implemented Change 2026-06-16

`tryDebitBalanceCents()` is implemented inside a Firestore transaction and uses
`FieldValue.increment(-amountCents)` only after checking the current balance.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-17 | Flush reconciliation was poisoned forever — credited earnings never reached the durable ledger/balance, so the developer dashboard showed $0. | `applyBalanceDeltaCents` threw `User not found` whenever no `users/{id}` doc existed, which under JWT sessions is the normal case for a freshly-credited developer. The throw nacked the whole flush batch and it retried indefinitely. | `applyBalanceDeltaCents` now **upserts**: a missing user doc is created carrying the credited balance (`set` with seed fields) instead of throwing. `tryDebitBalanceCents` still returns `false` on a missing user (payouts must not auto-create). |

## Planned Change 2026-06-20 Canonical Identity

Fix random Auth.js UUIDs splitting one OAuth user across anonymous Firestore
documents. Transactionally resolve a verified identity through `userIdentities`,
use a canonical email-derived ID on first sign-in, and merge identity metadata
without replacing balance, held earnings, payout fields, or creation time.

## Implemented Change 2026-06-20 Canonical Identity

`upsertFromIdentity` now runs one transaction that reads the provider mapping and
normalized-email matches, fails closed on conflicts, resolves one canonical ID,
merges identity metadata, and writes `userIdentities` without overwriting money.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Documented transactional canonical identity fix. | Codex |
| 2026-06-17 | `applyBalanceDeltaCents` upserts a missing user instead of throwing, so reconciliation is self-healing. | Claude |
| 2026-06-16 | Implemented Firestore atomic payout debit reservation. | Codex |
| 2026-06-16 | Created before adding atomic payout debit reservation. | Codex |
