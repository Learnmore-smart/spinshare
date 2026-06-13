# test-users.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Defines the fixed local/dev test accounts and credential validation, replacing the old "accept any user id" mock sign-in.

## What It Does

- Declares `LOCAL_TEST_USERS`: a developer and an advertiser account, each with a stable id, email, password, name, role, and provider.
- `findLocalTestUser(email, password)` resolves an account (case-insensitive email, exact password) or `null`.
- `isLocalCredentialsEnabled(env)` reports whether credential sign-in is allowed (every mode except production).

## Public API

| Name | Type | Description |
|------|------|-------------|
| `LocalTestUser` | interface | Shape of a local test account. |
| `LOCAL_TEST_USERS` | `readonly LocalTestUser[]` | The fixed local accounts. |
| `isLocalCredentialsEnabled` | function | True unless `SPINSHARE_MODE=production`. |
| `findLocalTestUser` | function | Validates an email/password pair against the accounts. |

## Dependencies

- **External:** `@spinshare/core` — `AuthProviderId`, `UserRole` types.

## Important Notes / NEVER Change

- Ids are stable and MUST match the data seeded by `seed-local-data.ts` and the session identity used by the dashboards.
- These accounts are local-only; the Credentials provider is never registered in production.
- Passwords here are development conveniences, not real secrets.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created local test accounts + credential validation. | Kiro |
