# extension.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Unit tests for the VS Code extension activation wiring.

## What It Does

- Mocks the `vscode` module and side-effect installers.
- Verifies activation-level UI wiring that is hard to cover through smaller
  units.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `activate` tests | Vitest suite | Activation behavior coverage. |

## Dependencies

- External: `vitest`.
- Internal: `./extension`.

## Important Notes / NEVER Change

- Do not touch real VS Code APIs, Claude settings, terminal shims, or the
  filesystem from these tests.
- Keep mocks narrow; activation integration tests should only assert wiring.

## Planned Change 2026-06-15 Persistent Sign-In Entry

Add red coverage proving activation shows a persistent status bar sign-in item
when the mocked auth manager reports no stored token.

## Planned Change 2026-06-16 Activation Sign-In Prompt Coverage

Add regression coverage proving activation does more than show the status bar:
when no token is loaded, activation should call `ensureAuthenticated()` so a
fresh install attempts the browser/device sign-in flow immediately.

## Planned Change 2026-06-19 Claude Code State Bridge Wiring

Add activation coverage proving a successful Claude Code adapter install starts
the VS Code state bridge with the returned `stateFilePath`, and disabling the
adapter disposes any active bridge.

## Implemented Change 2026-06-15 Persistent Sign-In Entry

Added activation-level coverage that mocks VS Code and `AuthManager`, activates
the extension, flushes activation promises, and asserts that a persistent
right-aligned status bar item is created, points at `spinshare.signIn`, and is
shown when no token exists.

## Implemented Change 2026-06-16 Activation Sign-In Prompt Coverage

Added activation-level coverage that asserts unauthenticated activation calls
`AuthManager.ensureAuthenticated()`. This locks the install-time sign-in prompt
contract separately from the fallback status bar entry.

## Implemented Change 2026-06-19 Claude Code State Bridge Wiring

Added activation-level coverage proving a returned Claude adapter
`stateFilePath` creates and starts `ClaudeCodeStateBridge`, and that disabling
`spinshare.claudeCodeAdapter` disposes the bridge before removing the adapter.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented activation tests for Claude Code state bridge wiring and disposal. | Codex |
| 2026-06-19 | Planned activation tests for Claude Code state bridge wiring. | Codex |
| 2026-06-16 | Added activation sign-in prompt regression coverage. | Codex |
| 2026-06-15 | Implemented persistent sign-in activation test. | Codex |
| 2026-06-15 | Created activation test plan for persistent sign-in entry. | Codex |
