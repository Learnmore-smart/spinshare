# canonical-user-id.ts

> Last updated: 2026-06-20 | Protection: CRITICAL

## Purpose

Creates stable, non-PII Firestore keys for canonical users and OAuth mappings.

## Planned API

- `normalizeIdentityEmail(email)` validates and lowercases an identity email.
- `canonicalUserIdForEmail(email)` hashes the normalized email with SHA-256.
- `identityMappingId(provider, providerAccountId)` hashes a provider/account key.

## Important Notes / NEVER Change

- Do not make IDs depend on a rotatable application secret.
- Keep normalization deterministic across all adapters.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-20 | Random OAuth UUIDs created duplicate user documents. | No canonical identity primitive existed. | Introduce deterministic first-sign-in and persistent mapping keys. |

## Implemented Change

All three planned functions are implemented with SHA-256 and strict empty-value
validation.
