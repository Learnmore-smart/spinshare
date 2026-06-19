# claude-code-state-bridge.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Shows Claude Code hook-managed SpinShare ads inside VS Code UI by watching the generated adapter state file.

## What It Does

- Reads the `state.json` file written by `spinshare-hook.cjs`.
- Shows one compact VS Code status-bar item while the state contains a fresh active ad.
- Hides the status-bar item when the state file disappears, becomes inactive, or expires.
- Opens the ad click-through URL when the status-bar item is clicked.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `ClaudeCodeStateBridge` | Class | Watches Claude hook state and mirrors active ads into a VS Code status-bar item. |
| `readClaudeCodeAdState` | Function | Parses and validates one state file snapshot. |

## Dependencies

- **Internal:** none beyond local VS Code-like type shapes.
- **External:** Node `fs`, `fs/promises`, and `path` for state file watching and reading.

## Agent Decisions / Thoughts

- **2026-06-19 Codex:** Claude Code's VS Code extension is a separate extension/webview. SpinShare cannot safely inject into that private webview through stable VS Code APIs. The technically viable bridge is to reuse the existing Claude hook state file and show the ad through SpinShare's own VS Code notification surface.
- **2026-06-19 Codex:** The hook script remains the source of ad fetch and tracking. The bridge must display only; it must not call `/api/ad` or `/api/track`, or it would duplicate impressions.
- **2026-06-19 Codex:** The progress notification plus information-message CTA was too intrusive and created two visible ad surfaces. Use a single status-bar item instead; the item itself is clickable when a URL exists.
- **2026-06-19 Codex:** Claude Code's VS Code extension can miss or delay Stop/StopFailure hook cleanup. The bridge should cap its own display duration to avoid stale UI even if the hook state file remains active.

## Important Notes / NEVER Change

- Do not report impressions from this bridge.
- Do not mutate Claude settings from this bridge.
- Treat expired or malformed state as no active ad.
- Use both file watching and polling because file watcher behavior differs across Windows/editor sandboxes.
- Do not use `showInformationMessage()` for every ad; that creates a second notification that can outlive the generation.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-19 | Claude Code VS Code ads were visually disturbing, duplicated, and could remain after loading. | The bridge rendered both a progress notification and a separate information-message click-through; the information message was independently dismissible and not tied to hook state cleanup. The bridge also trusted Claude's 120s hook state TTL. | Replace notification rendering with a single compact status-bar item and enforce a short bridge-side max display duration. |
| 2026-06-19 | Ads were visible in terminal Claude CLI but not in the Claude Code VS Code extension surface. | SpinShare installed Claude hooks/statusLine, but the VS Code extension did not observe the hook state and Claude's webview does not expose a stable injection point for third-party UI. | Add a VS Code state bridge that mirrors active hook state into a SpinShare notification. |

## Planned Change 2026-06-19 Compact Status-Bar Bridge

Replace the progress-notification/information-message pair with one status-bar
item. The item should update in place for active ad state, hide on missing or
expired state, register one internal click command for `destinationUrl`, and
apply a short bridge-local max display duration even when Claude leaves the
state file marked active.

## Implemented Change 2026-06-19 Claude Code State Bridge

Added `ClaudeCodeStateBridge` and `readClaudeCodeAdState`. The bridge reads
the generated Claude adapter `state.json`, opens one VS Code progress
notification for a fresh active ad, replaces it when the hook state changes,
and dismisses it when the state disappears or expires. It also surfaces the
existing click-through URL with an optional VS Code information-message action.

The bridge does not fetch ads and does not report impressions; the generated
Claude hook script remains the source of fetch and tracking.

## Implemented Change 2026-06-19 Compact Status-Bar Bridge

Replaced the progress notification and information-message CTA with one
status-bar item. The item uses `$(link-external)` when the ad has a
destination URL, registers `spinshare.openClaudeCodeAd` internally, and opens
the current destination when clicked. Repeated reads of the same state do not
create additional UI, and changed state updates the existing item in place.

`readClaudeCodeAdState()` now applies an 8-second bridge-local max display
duration in addition to the hook state's `expiresAtMs`. This keeps VS Code UI
from lingering when Claude Code misses or delays Stop/StopFailure cleanup.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented compact status-bar bridge and stale-state display cap. | Codex |
| 2026-06-19 | Planned compact status-bar bridge replacement for noisy notifications. | Codex |
| 2026-06-19 | Implemented state-file-to-notification bridge. | Codex |
| 2026-06-19 | Created bridge design before implementation. | Codex |
