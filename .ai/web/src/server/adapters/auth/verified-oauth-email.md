# verified-oauth-email.ts

> Last updated: 2026-06-20 | Protection: CRITICAL

## Purpose

Establishes a verified OAuth email before identity creation/linking.

## Planned Behavior

- Require Google's `email_verified` claim.
- Query GitHub's authenticated email endpoint and select only a verified email.
- Fail closed on missing access tokens, failed responses, or no verified address.

## Implemented Change

Google requires `email_verified === true`. GitHub resolves a verified primary or
fallback address through `/user/emails` and rejects malformed/failed responses.
