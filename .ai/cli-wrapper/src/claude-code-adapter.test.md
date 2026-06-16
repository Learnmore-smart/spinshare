# claude-code-adapter.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests the npm CLI Claude Code adapter planner and settings merge behavior.

## Planned Coverage

- Generated commands use quoted forward-slash paths so Windows shells can run
  them.
- Existing Claude settings and hooks are preserved.
- SpinShare hook handlers are appended once without duplication.
- Generated hook script reports positive short segments and requires a local
  token before fetching ads.
- Generated hook script sends that token to `GET /api/ad`.
- Generated hook/statusLine scripts read Claude stdin JSON and gate state by
  `session_id`.
- Merged statusLine config uses `refreshInterval: 1`.

## Planned Change 2026-06-15

Add tests before implementing the CLI-side Claude Code adapter installer.

## Implemented Change 2026-06-15

Added adapter tests for planner paths/commands, cumulative generated scripts,
settings merge preservation/deduplication, and default storage root resolution.

## Implemented Change 2026-06-15 Authenticated Ad Fetch

The adapter test now asserts that generated hook scripts define `fetchAd(token)`
and send `authorization: Bearer <token>` to `/api/ad`.

## Planned Change 2026-06-15 Generated Script Runtime Smoke Test

Mirror the VS Code adapter runtime smoke coverage for the npm CLI adapter,
because npm users rely entirely on the standalone generated hook/statusLine
scripts installed by `spinshare login` or `spinshare setup claude-code`.

Expected proof:
- generated scripts execute under real Node;
- `/api/ad` and `/api/track` receive the file credential token as bearer auth;
- statusLine output is session-gated and uses `$ <adText>`;
- Stop reports a positive view segment and clears state.

## Implemented Change 2026-06-15 Generated Script Runtime Smoke Test

Added the npm CLI adapter runtime smoke test. It runs generated scripts with
real Node child processes against a local HTTP server and proves file-token auth
for `/api/ad` and `/api/track`, session-gated statusLine output, positive
segment reporting, and state cleanup.

## Planned Change 2026-06-15 Duplicate Cross-Installer Hooks

Mirror the VS Code adapter regression coverage for cross-installer cleanup.
When a CLI install merges over a VS Code extension-installed SpinShare hook,
the old `spinshare-hook.cjs` command from another directory should be removed
and only the current CLI plan command should remain. Removal should delete all
SpinShare-owned hook/statusLine commands while preserving unrelated user hooks.

## Implemented Change 2026-06-15 Duplicate Cross-Installer Hooks

Added RED/GREEN regression tests for CLI cleanup over extension-installed
SpinShare entries. The merge test proves old extension hook commands are
removed before the CLI hook is added; the remove test proves SpinShare-owned
entries from another path are deleted without touching unrelated hooks.

## Planned Change 2026-06-15 Same-Session Stale State

Mirror the extension runtime coverage for stale active state. A second
`UserPromptSubmit` in the same Claude session must clear the old state and
fetch a fresh ad instead of returning early. This prevents a missed `Stop` from
turning the next prompt into an old-campaign report.

## Implemented Change 2026-06-15 Same-Session Stale State

The CLI adapter runtime smoke test now executes a second `UserPromptSubmit` in
the same session after injecting stale active state. It proves the generated
hook fetches a fresh ad, statusLine displays that fresh ad, and Stop reports the
fresh campaign.

## Implemented Change 2026-06-15 Colorized Clickable StatusLine

The CLI adapter runtime smoke test now asserts that stdout includes bold cyan
ANSI styling and the OSC8 hyperlink wrapper around the ad's destination URL.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Added statusLine color/link runtime assertions. | Codex |
| 2026-06-15 | Implemented same-session stale state reset tests. | Codex |
| 2026-06-15 | Planned same-session stale state reset tests. | Codex |
| 2026-06-15 | Implemented duplicate cross-installer hook cleanup tests. | Codex |
| 2026-06-15 | Planned duplicate cross-installer hook cleanup tests. | Codex |
| 2026-06-15 | Implemented generated script runtime smoke coverage. | Codex |
| 2026-06-15 | Planned generated script runtime smoke coverage. | Codex |
| 2026-06-15 | Implemented authenticated ad fetch regression assertion. | Codex |
| 2026-06-15 | Planned authenticated ad fetch regression assertion. | Codex |
| 2026-06-15 | Implemented CLI Claude Code adapter tests. | Codex |
| 2026-06-15 | Created test doc before adding CLI Claude Code adapter tests. | Codex |
