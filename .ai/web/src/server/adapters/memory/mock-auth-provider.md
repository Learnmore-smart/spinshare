# mock-auth-provider.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Local/test AuthProvider implementation for device-flow and bearer token validation.

## Planned Change

Allow tests to mint mock tokens with optional claims such as email. The production device token already carries email claims; mock auth should mirror that so route tests can exercise email-based campaign claim behavior.

## Constraints

- Keep existing `mintToken(userId)` behavior compatible.
- Do not introduce persistence or network dependencies.

## Implemented Change

`mintToken(userId, claims?)` now stores full `AuthClaims`; `validateToken()` returns a copy of those claims.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented optional mock token claims. | Codex |
| 2026-06-15 | Planned optional mock token claims for email claim tests. | Codex |
