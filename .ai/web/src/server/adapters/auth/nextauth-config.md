# nextauth-config.ts

> Last updated: 2026-06-20 | Protection: CRITICAL

## Purpose

Configures browser authentication and binds Auth.js sessions to canonical users.

## Current Bug

Without an Auth.js database adapter, OAuth creates a random `user.id` on every
sign-in. The current JWT callback copies it to `token.sub`, splitting one person
across Firestore user, ledger, balance, and bonus records.

## Fix Plan

- Resolve a verified OAuth email.
- Persist/resolve the provider account through `UserRepository`.
- Put the returned canonical ID in `token.sub`.
- Version new JWT identities and invalidate old random-UUID JWTs once.
- Preserve explicit stable IDs for local credential users.

## Important Notes / NEVER Change

- Never issue an OAuth JWT before identity persistence succeeds.
- Never link accounts using an unverified email.

## Implemented Change

The Auth.js config now delegates callbacks to `createAuthCallbacks` with lazy
access to the configured `UserRepository`.
