# auth.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests VS Code extension authentication behavior, including device-flow login,
SecretStorage persistence, and file-token mirroring for generated Claude Code
hook scripts.

## Current Coverage

- Existing SecretStorage tokens are loaded without prompting.
- Unauthenticated users are prompted and complete browser device flow.
- Successful login stores the token and mirrors it when a token mirror is
  configured.
- Sign-out clears SecretStorage and the configured mirror.
- Denied, dismissed, and expired login flows return safe failures.

## Planned Change 2026-06-15 Existing Token Mirror Sync

Add a regression test for extension upgrade / restart behavior: when
`AuthManager.initialize()` loads an already-stored SecretStorage token and a
token mirror is configured, it should mirror that token into the CLI-compatible
credentials file. Generated Claude Code hooks cannot read VS Code SecretStorage;
without this sync, previously signed-in extension users would need to sign in
again before Claude statusLine ads can be attributed.

The test should also document the intentional non-behavior: if SecretStorage has
no token, `initialize()` must not clear the shared file credential because that
file may belong to a separate npm CLI login.

## Implemented Change 2026-06-15 Existing Token Mirror Sync

Added regression tests proving `initialize()` mirrors an existing stored token
and does not clear the shared mirror when no stored token exists.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added tests for clearing invalid stored tokens and preserving unknown/offline tokens. | Codex |
| 2026-06-16 | Planned invalid stored-token clearing regression coverage. | Codex |
| 2026-06-15 | Implemented existing-token mirror sync tests. | Codex |
| 2026-06-15 | Created mirror doc and planned existing-token mirror sync tests. | Codex |
