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

## Implemented Change 2026-06-15 Persistent Sign-In Entry

Added activation-level coverage that mocks VS Code and `AuthManager`, activates
the extension, flushes activation promises, and asserts that a persistent
right-aligned status bar item is created, points at `spinshare.signIn`, and is
shown when no token exists.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented persistent sign-in activation test. | Codex |
| 2026-06-15 | Created activation test plan for persistent sign-in entry. | Codex |
