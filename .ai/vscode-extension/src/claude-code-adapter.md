# claude-code-adapter.ts

> Last updated: 2026-06-17 | Protection: CRITICAL

## Purpose

Installs the Claude Code-specific SpinShare adapter by writing hook/statusLine scripts and safely patching `~/.claude/settings.json`.

## Planned API

| Name | Type | Description |
|------|------|-------------|
| `buildClaudeCodeAdapterPlan` | Function | Pure planner for script paths, commands, and generated files. |
| `mergeClaudeCodeSettings` | Function | Merges SpinShare `statusLine` and hooks into existing Claude settings. |
| `installClaudeCodeAdapter` | Function | Writes scripts, backs up settings, and writes merged settings. |

## Design Decisions

- Use Claude Code official hooks/statusLine as the MVP path.
- Store generated scripts in extension global storage, not inside `~/.claude`.
- Backup `settings.json` before first patch.
- Preserve existing user hooks and settings when merging.
- Hook/statusLine scripts may read `SPINSHARE_TOKEN` or the CLI fallback credential file for tracking; VSCode SecretStorage sync is a later hardening step.

## Implemented Change

Added adapter planner, settings merger, generated hook/statusLine scripts, and installer. Installer writes scripts under extension global storage, backs up existing Claude settings, and writes merged settings.

## Planned Change 2026-06-15 Cumulative Claude Code Tracking

Generated Claude hook scripts must align with the cumulative 3-second billing
model. They should report any positive viewed segment instead of dropping
segments shorter than 3000 ms, because the backend now stores progress and only
settles after cumulative viewability reaches 3000 ms.

The generated statusLine config should set a short `refreshInterval` so Claude
Code can show the ad during early thinking, not only after an assistant message
display event. The statusLine text should use an ASCII `$ ` prefix instead of
the mojibake glyph currently in the generated script.

Generated hooks should also require a local token before fetching/showing an ad;
otherwise anonymous users can see free ads that cannot be attributed or paid.

## Planned Change 2026-06-15 Authenticated Ad Fetch

Generated Claude hook scripts must pass the local token to `GET /api/ad` as an
Authorization bearer header. The backend only receives a `developerId` when this
header is present; without it, authenticated developers cannot get their pending
campaign first and cumulative "continue the same ad" semantics break.

## Planned Change 2026-06-15 Adapter Removal

Add a reversible removal path for the VS Code/Cursor/Trae-installed Claude Code
adapter. Automatic install is acceptable only if there is a safe way to undo the
patch to `~/.claude/settings.json`.

The removal behavior should:

- remove only SpinShare statusLine/hooks from current Claude settings;
- preserve unrelated user settings and unrelated hook handlers;
- clean generated adapter state/scripts on a best-effort basis;
- be callable from a command palette command.

## Bug Fix Plan 2026-06-15 Windows BOM Settings Parse

Windows PowerShell can write JSON files with a UTF-8 BOM. `JSON.parse()` does
not accept the BOM prefix, so the installer can treat an otherwise valid
`~/.claude/settings.json` as invalid and overwrite it with only SpinShare
settings. This is a data-loss risk for existing Claude Code settings.

Fix strategy: parse Claude settings through a shared helper that strips a
leading BOM before `JSON.parse()`. Cover install with a real filesystem test
that writes BOM-prefixed settings and verifies theme/user hooks survive
install/remove.

## Bug Fix Implemented 2026-06-15 Windows BOM Settings Parse

Added BOM-safe `parseClaudeSettings()` and routed install/remove parsing through
it. The filesystem install/remove test now writes a BOM-prefixed settings file
and verifies unrelated settings/hooks survive.

## Implemented Change 2026-06-15 Authenticated Ad Fetch

Generated hook scripts now call `fetchAd(token)`, and `/api/ad` receives
`authorization: Bearer <token>` plus `accept: application/json`. This lets the
backend select the developer's pending campaign before normal bidding.

## Implemented Change 2026-06-15 Adapter Removal

Added `removeClaudeCodeSettings()` and `removeClaudeCodeAdapter()`. Removal
deletes only SpinShare statusLine/hooks from current Claude settings, preserves
unrelated settings/hooks, and removes generated adapter files/state when the
filesystem supports recursive removal.

## Planned Change 2026-06-15 StatusLine Marker Cleanup

The generated statusLine script still contains an unused non-ASCII `▣ ` marker
even though visible output uses the ASCII `$ ` prefix. Remove the dead marker
so generated user-facing script files are clean and consistent with the
documented display format.

## Implemented Change 2026-06-15 StatusLine Marker Cleanup

Removed the unused `▣ ` marker from the generated statusLine script. The only
ad text prefix emitted by the generated script is now ASCII `$ `.

## Implemented Change 2026-06-15 Cumulative Claude Code Tracking

Generated hook scripts now:
- report any positive segment (`viewDurationMs >= 1`) to `/api/track`;
- require a local SpinShare token before fetching/showing an ad;
- keep using the backend to decide when cumulative viewability reaches 3000 ms.

Generated statusLine settings now include `refreshInterval: 1`, and the actual
printed ad text uses an ASCII `$ ` prefix.

## Planned Change 2026-06-15 Claude Session Gating

Claude Code command hooks and statusLine commands receive JSON on stdin with a
`session_id`. Generated scripts should read that JSON and bind ad state to the
current session. This prevents stale state from a crashed/abandoned Claude run
from being displayed or tracked in a later session.

The hook script should:
- store `sessionId` with the active ad state;
- ignore/clear active state from a different session when starting a turn;
- avoid tracking a stop event for a different session.

The statusLine script should display the ad only when the state session matches
the current statusLine input session, with a fallback for older state files that
do not have a session id.

## Implemented Change 2026-06-15 Claude Session Gating

Generated hook and statusLine scripts now read Claude's stdin JSON and derive
`session_id`. New ad state stores `sessionId`; stop tracking is skipped when a
state belongs to a different session; statusLine rendering is gated the same
way. Older state files without `sessionId` still render/track as a compatibility
fallback.

## Bug Fix Plan 2026-06-15 Duplicate Cross-Installer Hooks

If a user installs both the VS Code extension adapter and the npm CLI adapter,
both installers patch the same `~/.claude/settings.json` but use different
script directories. The current merge logic only deduplicates the exact current
command, so older SpinShare hook commands from another installer can remain
active. That can make a single Claude turn fetch/report ads twice, including a
hook whose statusLine is no longer visible.

Fix strategy: treat generated `spinshare-hook.cjs` and
`spinshare-statusline.cjs` commands as SpinShare-owned entries regardless of
their directory. During merge, remove previous SpinShare-owned hook/statusLine
entries before adding the current plan. During remove, also remove any
SpinShare-owned entries, not only the current plan path. Preserve unrelated user
hooks and settings.

## Bug Fix Implemented 2026-06-15 Duplicate Cross-Installer Hooks

Added SpinShare-owned command detection for generated `spinshare-hook.cjs` and
`spinshare-statusline.cjs` commands. `mergeClaudeCodeSettings()` now removes old
SpinShare hook commands from any previous installer path before adding the
current adapter's hook handlers. `removeClaudeCodeSettings()` removes any
SpinShare-owned hook/statusLine commands while preserving unrelated user hooks
and settings.

## Bug Fix Plan 2026-06-15 Same-Session Stale State

Generated hooks currently return early whenever an active state exists for the
same Claude `session_id`. That protects against duplicate `MessageDisplay`
events in one turn, but it also means a missed `Stop` hook can leave stale state
that the next `UserPromptSubmit` in the same session reuses. The next Stop can
then report the old campaign/duration instead of starting a fresh turn.

Fix strategy: treat `UserPromptSubmit` as the authoritative start of a new
Claude turn. On `UserPromptSubmit`, clear any existing active state, even when
it matches the same session, then fetch/write a fresh ad. Keep the existing
early return for `MessageDisplay` when a matching active state already exists,
so one turn still does not double-fetch.

## Bug Fix Implemented 2026-06-15 Same-Session Stale State

Generated hook scripts now distinguish prompt-start and display events.
`UserPromptSubmit` clears any existing active state before fetching a fresh ad,
even when the old state belongs to the same Claude session. `MessageDisplay`
still reuses a matching active state and returns early, preserving same-turn
deduplication.

## Implemented Change 2026-06-15 Colorized Clickable StatusLine

Generated statusLine output now wraps the entire `$ <adText>` display in bold
cyan ANSI color. If the active ad includes `destinationUrl`, the same styled
text remains wrapped in an OSC8 terminal hyperlink so terminals that support
OSC8 can open the click-through URL directly.

Claude Code controls the physical placement of statusLine output. The adapter
can make the status line more visible, but it cannot force the ad to appear
directly under Claude's `Thinking...` row.

## Bug Fix Plan 2026-06-17 Expiring Active StatusLine State

Generated statusLine output currently trusts any `active: true` state until a
`Stop`/`StopFailure` hook clears it. If Claude Code misses that stop hook, or if
a post-stop `MessageDisplay` event starts a fresh ad, the ad can remain visible
after loading has ended.

Fix strategy: make only `UserPromptSubmit` start a new ad. Keep
`MessageDisplay` installed only for compatibility/replacement of old settings,
but make it a no-op so it cannot start ads after loading. Add an `expiresAtMs`
timestamp to generated active state and have the generated statusLine command
hide expired state. This keeps normal stop-based tracking intact while giving
the statusLine a bounded fallback when Claude Code does not call our stop hook.

## Bug Fix Implemented 2026-06-17 Expiring Active StatusLine State

Generated hook scripts now start ads only on `UserPromptSubmit`.
`MessageDisplay` remains in the owned hook list but returns without fetching, so
old installed settings are replaced while post-loading display events cannot
start a new ad. Active state includes `expiresAtMs`; generated statusLine output
hides expired state, and tracking caps duration at the expiry timestamp.

Verification:
`corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/claude-code-adapter.test.ts`
passed 11 tests.

## Verification

- Red: adapter test initially failed because `claude-code-adapter.ts` did not exist.
- Green: `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/claude-code-adapter.test.ts` passed.
- Full extension tests and `tsc --noEmit` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Strict hook credential matching: removed the production fallback for an untagged/mismatched baseUrl so local/prod credentials never mix (Bug B; mirrors the CLI adapter). | Claude |
| 2026-06-17 | Implemented expiring generated statusLine state and MessageDisplay no-op. | Codex |
| 2026-06-17 | Planned expiring generated statusLine state to prevent stale ads after loading. | Codex |
| 2026-06-16 | Implemented baseUrl-aware credential file reading for prod/local hook separation. | Codex |
| 2026-06-16 | Planned baseUrl-aware credential file reading for prod/local hook separation. | Codex |
| 2026-06-15 | Colorized generated statusLine output while preserving OSC8 links. | Codex |
| 2026-06-15 | Implemented same-session stale state reset. | Codex |
| 2026-06-15 | Planned same-session stale state reset. | Codex |
| 2026-06-15 | Implemented duplicate cross-installer hook cleanup. | Codex |
| 2026-06-15 | Planned duplicate cross-installer hook cleanup. | Codex |
| 2026-06-15 | Implemented reversible VS Code Claude Code adapter removal. | Codex |
| 2026-06-15 | Planned reversible VS Code Claude Code adapter removal. | Codex |
| 2026-06-15 | Planned Windows BOM-safe Claude settings parsing fix. | Codex |
| 2026-06-15 | Implemented Windows BOM-safe Claude settings parsing fix. | Codex |
| 2026-06-15 | Implemented statusLine marker cleanup. | Codex |
| 2026-06-15 | Planned statusLine marker cleanup. | Codex |
| 2026-06-15 | Implemented authenticated `/api/ad` fetch for pending campaign continuity. | Codex |
| 2026-06-15 | Planned authenticated `/api/ad` fetch for pending campaign continuity. | Codex |
| 2026-06-15 | Implemented Claude session gating for generated hook/statusLine scripts. | Codex |
| 2026-06-15 | Planned Claude session gating for generated hook/statusLine scripts. | Codex |
| 2026-06-15 | Implemented cumulative tracking/statusLine refresh/token gating fix. | Codex |
| 2026-06-15 | Planned cumulative tracking/statusLine refresh/token gating fix. | Codex |
| 2026-06-15 | Implemented Claude Code adapter planner/installer. | Codex |
| 2026-06-15 | Created design doc before implementing Claude Code adapter installer. | Codex |
