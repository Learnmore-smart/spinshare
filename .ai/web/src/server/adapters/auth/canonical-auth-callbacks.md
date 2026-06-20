# canonical-auth-callbacks.ts

> Last updated: 2026-06-20 | Protection: CRITICAL

## Purpose

Implements canonical JWT/session identity behavior independently from Auth.js
route instantiation so it can be tested without Next.js module-loader coupling.

## Planned Behavior

- Persist verified OAuth identities and replace random subjects.
- Preserve stable credentials IDs.
- Reject legacy unversioned JWTs.
- Expose canonical subjects on browser sessions.

## Dependencies

- `UserRepository`
- `resolveVerifiedOAuthEmail`

## Implemented Change

OAuth JWTs persist first and receive the repository's canonical subject;
credentials keep fixed IDs; unversioned legacy JWTs return `null`.
