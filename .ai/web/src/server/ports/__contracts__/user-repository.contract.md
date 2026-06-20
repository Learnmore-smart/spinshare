# user-repository.contract.ts

> Last updated: 2026-06-20 | Protection: CRITICAL

## Purpose

Shared behavioral contract for every user repository adapter.

## Planned Change

Add canonical identity cases for repeat sign-in, verified-email cross-provider
convergence, provider-email changes, unverified rejection, and preservation of
financial fields.

## Implemented Change

The shared contract now runs five identity invariants against memory and the
Firestore emulator binding, in addition to all existing money invariants.
