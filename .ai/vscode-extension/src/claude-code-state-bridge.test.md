# claude-code-state-bridge.test.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Regression tests for mirroring Claude Code hook state into a compact VS Code status-bar item.

## What It Does

- Verifies a fresh active hook state shows one status-bar item.
- Verifies deleting or expiring state hides that status-bar item.
- Verifies repeated reads of the same state do not create duplicate UI.
- Verifies click-through actions are wired through the status-bar item command.
- Verifies bridge-local display TTL hides stale active state even when Claude misses Stop cleanup.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `ClaudeCodeStateBridge` tests | Vitest suite | Covers the state-file display bridge. |

## Dependencies

- **Internal:** `./claude-code-state-bridge`.
- **External:** `vitest`, Node `fs/promises`, `os`, and `path`.

## Agent Decisions / Thoughts

- **2026-06-19 Codex:** Tests should use real temporary files for state parsing and fake injected VS Code APIs for deterministic notification behavior.
- **2026-06-19 Codex:** The first red test should fail because the bridge module does not exist yet, proving the new behavior is not already implemented.
- **2026-06-19 Codex:** The noisy-notification regression should fail against the current implementation because it calls `withProgress()` and `showInformationMessage()` instead of `createStatusBarItem()`.

## Important Notes / NEVER Change

- Do not rely on real VS Code or Claude Code processes.
- Keep tests focused on display mirroring, not ad fetch/tracking.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-19 | Bridge UI duplicated ads and lingered after loading. | Tests asserted notification behavior instead of compact status-bar behavior and did not cover bridge-side stale state capping. | Update tests to require a single status-bar item, click command, hide-on-clear, and display TTL. |
| 2026-06-19 | No extension-side display for active Claude hook state. | Missing watcher/bridge coverage. | Add regression tests for state-to-notification behavior. |

## Planned Change 2026-06-19 Compact Status-Bar Bridge Tests

Replace notification expectations with status-bar expectations. Tests should
prove `withProgress()` and `showInformationMessage()` are not called, one
status item is reused, clicking the registered command opens the ad URL, and an
active state older than the bridge-local display cap is treated as hidden.

## Implemented Change 2026-06-19 Claude Code State Bridge Tests

Added Vitest coverage for malformed/expired state parsing, one-notification
display for fresh hook state, dismissal when the state file disappears,
duplicate suppression for repeated reads, changed-state replacement, and
click-through action wiring.

## Implemented Change 2026-06-19 Compact Status-Bar Bridge Tests

Updated tests to require one reused status-bar item, no `withProgress()` calls,
no `showInformationMessage()` calls, click-through via
`spinshare.openClaudeCodeAd`, hidden state when the file disappears, and stale
active state rejection after the bridge-local display cap.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented compact status-bar bridge regression tests. | Codex |
| 2026-06-19 | Planned compact status-bar bridge regression tests. | Codex |
| 2026-06-19 | Implemented state bridge regression tests. | Codex |
| 2026-06-19 | Created test design before implementation. | Codex |
