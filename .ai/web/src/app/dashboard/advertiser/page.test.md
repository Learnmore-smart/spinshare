# page.test.tsx

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Focused tests for the advertiser dashboard server page token-minting boundary.

## Planned Test 2026-06-16

Reproduce the homepage checkout claim bug by mocking a browser session with an
email and asserting the token minter receives that email claim. The test should
fail before the page passes email to `mintToken`.

## Implemented Test

The test mocks `auth()` and `getContainer()` and asserts the server page calls
`mintToken(userId, { email, role: "advertiser" })`.

## Verification

- Red: focused run failed because `mintToken` was called with only `userId`.
- Green: focused run passed after the page included email/role claims.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented dashboard token email-claim regression test. | Codex |
| 2026-06-16 | Planned dashboard token email-claim regression test. | Codex |
