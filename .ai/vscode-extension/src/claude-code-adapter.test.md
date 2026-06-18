# claude-code-adapter.test.ts

> Last updated: 2026-06-17 | Protection: STANDARD

## Purpose

Tests Claude Code adapter planning and settings merge behavior.

## Planned Coverage

- Generated commands use quoted forward-slash paths so Windows/Git Bash can run them.
- Existing Claude settings are preserved.
- Existing hooks are preserved and SpinShare hook handlers are appended without duplication.
- `statusLine` is set to the generated SpinShare command.
- Generated hook script reports positive short view segments instead of dropping
  segments shorter than 3000 ms.
- Generated hook script requires a local token before fetching/showing ads.
- Generated hook script sends that token to `GET /api/ad` so pending cumulative
  ads are selected for the authenticated developer.
- Generated statusLine refreshes every second and uses an ASCII `$ ` ad prefix.

## Planned Change 2026-06-15

Add regression assertions for cumulative tracking behavior and Claude Code
statusLine refresh/display output.

## Implemented Change 2026-06-15

Adapter tests now assert:
- generated hooks report positive short segments and do not contain the old
  `< 3000` drop condition;
- generated hooks check for a local token before fetching ads;
- generated statusLine output uses `$ `;
- merged statusLine config sets `refreshInterval: 1`.

## Planned Change 2026-06-15 Claude Session Gating

Add assertions that generated hook/statusLine scripts read Claude's stdin JSON
and persist/check `session_id` so stale state from a different Claude session is
not displayed or tracked.

## Implemented Change 2026-06-15 Claude Session Gating

The adapter test now asserts that generated hook/statusLine scripts include
session id extraction and `stateMatchesSession(state)` checks.

## Implemented Change 2026-06-15 Authenticated Ad Fetch

The adapter test now asserts that generated hook scripts define `fetchAd(token)`
and send `authorization: Bearer <token>` to `/api/ad`.

## Planned Change 2026-06-15 StatusLine Marker Cleanup

Add an assertion that the generated statusLine script does not contain the old
unused non-ASCII `▣ ` marker and only relies on the ASCII `$ ` display prefix.

## Implemented Change 2026-06-15 StatusLine Marker Cleanup

The adapter regression test now fails if the generated statusLine script
contains `▣ ` and still asserts the ASCII `$ ` display prefix.

## Planned Change 2026-06-15 Generated Script Runtime Smoke Test

Add execution-level coverage for generated hook/statusLine scripts instead of
only string inspection. The test should write the generated `.cjs` files to a
temporary adapter directory, run them with real `node` child processes, feed
Claude-like stdin JSON containing `session_id`, and use a local HTTP server for
`/api/ad` and `/api/track`.

Expected proof:
- `UserPromptSubmit` fetches `/api/ad` with `Authorization: Bearer <token>`.
- the generated state file is written for the matching session;
- the statusLine script prints `$ <adText>` for the same session and nothing for
  a different session;
- `Stop` posts a positive `viewDurationMs` with the campaign id and bearer
  token, then clears state.

## Implemented Change 2026-06-15 Generated Script Runtime Smoke Test

Added a focused runtime smoke test that starts a local HTTP server, writes a
file credential, writes generated hook/statusLine scripts to a temp adapter
directory, and executes them with real Node child processes. The test proves
token-authenticated `/api/ad`, state write, session-gated statusLine display,
token-authenticated `/api/track`, positive view duration reporting, and state
cleanup on `Stop`.

## Planned Change 2026-06-15 Duplicate Cross-Installer Hooks

Add regression coverage for installing the VS Code adapter over an existing
npm CLI adapter entry. The merge test should fail until old
`spinshare-hook.cjs` commands from another directory are removed and replaced
with only the current plan's command, while unrelated user hooks remain.

Add removal coverage that proves `removeClaudeCodeSettings()` removes
SpinShare-owned hook/statusLine commands even when they came from another
installer path, without deleting unrelated hooks.

## Implemented Change 2026-06-15 Duplicate Cross-Installer Hooks

Added RED/GREEN regression tests for cross-installer cleanup. The tests prove
that merge replaces a previous npm CLI SpinShare hook/statusLine with the
current extension adapter and that remove deletes SpinShare-owned entries from
another path while preserving unrelated hooks.

## Planned Change 2026-06-15 Same-Session Stale State

Add runtime coverage proving that a second `UserPromptSubmit` in the same
Claude session clears stale active state and fetches a fresh ad. This should
fail on the current generated hook because it returns early for any matching
active state. The existing runtime test should still prove statusLine display
and Stop tracking for the new state.

## Implemented Change 2026-06-15 Same-Session Stale State

The runtime smoke test now executes two `UserPromptSubmit` events in the same
session after manually writing stale active state. It proves `/api/ad` is called
again, a fresh campaign is stored, statusLine displays the fresh ad, and Stop
tracks the fresh campaign.

## Implemented Change 2026-06-15 Colorized Clickable StatusLine

The adapter tests now assert that generated statusLine scripts contain the
`accent(text)` helper and that runtime stdout contains both bold cyan ANSI text
and the OSC8 hyperlink wrapper for `destinationUrl`.

## Planned Change 2026-06-17 Expired StatusLine State Regression

Add runtime coverage for the stuck statusLine bug. The generated statusLine
script should suppress an active state whose `expiresAtMs` is in the past. This
locks the extension adapter to the same behavior as the npm CLI adapter.

Also add runtime coverage that `MessageDisplay` after `Stop` does not fetch a
fresh ad or recreate state. This prevents a post-loading display event from
leaving an ad visible after the Claude turn has ended.

## Implemented Change 2026-06-17 Expired StatusLine State Regression

The generated script runtime smoke test now covers expired active state and
post-stop `MessageDisplay`. It asserts expired state prints no statusLine output
and that a `MessageDisplay` event after `Stop` does not fetch a fresh ad or
recreate state.

RED verification before implementation:
`corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/claude-code-adapter.test.ts`
failed because generated scripts did not contain `expiresAtMs` and statusLine
printed expired state.

GREEN verification after implementation:
`corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/claude-code-adapter.test.ts`
passed 11 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented expired statusLine state and post-stop MessageDisplay regression coverage. | Codex |
| 2026-06-17 | Planned expired statusLine state runtime regression coverage. | Codex |
| 2026-06-16 | Added runtime coverage for ignoring mismatched credential-file baseUrl values. | Codex |
| 2026-06-16 | Planned runtime coverage for ignoring mismatched credential-file baseUrl values. | Codex |
| 2026-06-15 | Added statusLine color/link runtime assertions. | Codex |
| 2026-06-15 | Implemented same-session stale state reset tests. | Codex |
| 2026-06-15 | Planned same-session stale state reset tests. | Codex |
| 2026-06-15 | Implemented duplicate cross-installer hook cleanup tests. | Codex |
| 2026-06-15 | Planned duplicate cross-installer hook cleanup tests. | Codex |
| 2026-06-15 | Implemented generated script runtime smoke coverage. | Codex |
| 2026-06-15 | Planned generated script runtime smoke coverage. | Codex |
| 2026-06-15 | Implemented statusLine marker cleanup assertion. | Codex |
| 2026-06-15 | Planned statusLine marker cleanup assertion. | Codex |
| 2026-06-15 | Implemented authenticated ad fetch regression assertion. | Codex |
| 2026-06-15 | Planned authenticated ad fetch regression assertion. | Codex |
| 2026-06-15 | Implemented session-gating assertions for generated scripts. | Codex |
| 2026-06-15 | Planned session-gating assertions for generated scripts. | Codex |
| 2026-06-15 | Implemented cumulative tracking/statusLine regression assertions. | Codex |
| 2026-06-15 | Planned cumulative tracking/statusLine regression assertions. | Codex |
| 2026-06-15 | Created test doc before adding adapter tests. | Codex |
