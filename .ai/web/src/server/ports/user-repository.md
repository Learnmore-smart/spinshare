# user-repository.ts

> Last updated: 2026-06-16 | Protection: PROTECTED

## Purpose

Port for durable user storage, including identity upsert, payout connection
metadata, and balance mutations.

## What It Does

- Loads users by id.
- Upserts users from OAuth identities.
- Applies signed balance deltas from flush/reconciliation.
- Stores Stripe Connect account metadata.

## Planned Change 2026-06-16

Add `tryDebitBalanceCents(id, amountCents): Promise<boolean>` for payout
withdrawal reservation. The method must atomically subtract only when the user
exists and the current durable balance is at least the requested amount. It must
return `false` without mutation when funds are insufficient or the user is
missing.

## Implemented Change 2026-06-16

`UserRepository` now includes `tryDebitBalanceCents()`.

## Planned Change 2026-06-20 Canonical Identity

Require `ExternalIdentity.emailVerified: true`. `upsertFromIdentity` must resolve
provider accounts to one canonical user, reject unverified identities, refresh
identity metadata, and preserve financial state.

## Implemented Change 2026-06-20 Canonical Identity

`ExternalIdentity` now requires literal `emailVerified: true`; both adapters
enforce it at runtime before resolving a user.

## Agent Decision 2026-06-20

Identity verification belongs at the repository boundary as defense in depth,
even though Auth.js validates it first.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned verified canonical identity contract. | Codex |
| 2026-06-16 | Added atomic payout debit reservation method to the port. | Codex |
| 2026-06-16 | Created before adding atomic balance debit reservation. | Codex |
