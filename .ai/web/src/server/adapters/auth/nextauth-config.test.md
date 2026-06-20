# nextauth-config.test.ts

> Last updated: 2026-06-20 | Protection: CRITICAL

## Purpose

Regression tests proving Auth.js JWT subjects use canonical persisted user IDs.

## Planned Coverage

- Random OAuth user IDs are replaced.
- Repeated/cross-provider sign-ins converge.
- Credentials preserve fixed IDs.
- Legacy unversioned OAuth JWTs are rejected.

## Verification

Four callback tests pass using the real memory repository.
