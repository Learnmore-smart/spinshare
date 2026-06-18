# claude-code-adapter.ts

> Last updated: 2026-06-17 | Protection: CRITICAL

## Purpose

Installs the Claude Code-specific SpinShare adapter from the npm CLI path by
writing hook/statusLine scripts and safely patching `~/.claude/settings.json`.

## Planned API

| Name | Type | Description |
|------|------|-------------|
| `buildClaudeCodeAdapterPlan` | Function | Pure planner for script paths, commands, and generated files. |
| `mergeClaudeCodeSettings` | Function | Merges SpinShare statusLine and hooks into existing Claude settings. |
| `installClaudeCodeAdapter` | Function | Writes scripts, backs up settings, and writes merged settings. |
| `defaultClaudeCodeAdapterStorageRoot` | Function | Resolves the CLI-owned config directory for generated scripts/state. |

## Design Decisions

- The npm CLI must support the same Claude Code hooks/statusLine approach as
  the VS Code extension so npm users can get no-touch `claude` behavior after
  login/setup.
- Generated scripts live under the SpinShare config directory, not under
  `~/.claude`, while `~/.claude/settings.json` contains only commands.
- Settings patching must preserve existing user settings/hooks and create a
  backup before first write.
- Generated hooks read the CLI credential file or `SPINSHARE_TOKEN`, not a token
  embedded in Claude settings.
- Behavior should match the extension adapter: short segment reporting, token
  gating, `refreshInterval: 1`, ASCII display prefix, and `session_id` gating.
- `GET /api/ad` must receive the bearer token so the backend can return pending
  cumulative-progress ads for the authenticated developer.

## Planned Change 2026-06-15 Authenticated Ad Fetch

Generated Claude hook scripts must send Authorization on `GET /api/ad`; without
this, npm CLI users can report short segments but the next Claude turn cannot
reselect the same pending ad.

## Planned Change 2026-06-15 Adapter Removal

Add a reversible removal path for the CLI-installed Claude Code adapter. The
installer already writes a backup before patching `~/.claude/settings.json`, but
there is no command to undo the patch. This makes automatic install risky.

The removal behavior should:

- remove only SpinShare statusLine/hooks from current Claude settings;
- preserve unrelated user settings and unrelated hook handlers;
- clean generated adapter state/scripts on a best-effort basis;
- expose a CLI command through `spinshare setup claude-code --remove`.

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

Generated hook scripts now call `fetchAd(token)` and include the bearer token in
the `/api/ad` request so pending cumulative ads are selected for the
authenticated developer.

## Implemented Change 2026-06-15 Adapter Removal

Added `removeClaudeCodeSettings()` and `removeClaudeCodeAdapter()`. Removal
deletes only SpinShare statusLine/hooks from current Claude settings, preserves
unrelated settings/hooks, and removes generated adapter files/state when the
filesystem supports recursive removal.

## Planned Change 2026-06-15

Add a CLI-side Claude Code adapter installer so `spinshare setup claude-code`
and `spinshare login` can install the official Claude Code hooks/statusLine
integration without requiring the VS Code extension.

## Implemented Change 2026-06-15

Added the CLI-side adapter planner/settings merger/installer. It mirrors the
extension adapter behavior: generated scripts report positive short segments,
require a local token before fetching ads, bind state to Claude `session_id`,
write `statusLine.refreshInterval=1`, and preserve existing settings/hooks.

`defaultClaudeCodeAdapterStorageRoot()` resolves the generated script/state
directory under the SpinShare config directory.

## Bug Fix Plan 2026-06-15 Duplicate Cross-Installer Hooks

If a user installs both the npm CLI adapter and the VS Code extension adapter,
each installer writes different generated script paths into the same Claude
settings file. The current merge logic only avoids duplicating the exact current
command, so hook commands from the other installer can remain active. This can
double-fetch/double-report ad views for one Claude turn, and one of those views
may not correspond to the statusLine currently visible to the user.

Fix strategy: identify generated SpinShare commands by the owned script names
`spinshare-hook.cjs` and `spinshare-statusline.cjs`, not by the exact current
directory. Merge should remove previous SpinShare-owned entries before adding
the current plan. Removal should also remove all SpinShare-owned entries while
preserving unrelated user hooks/settings.

## Bug Fix Implemented 2026-06-15 Duplicate Cross-Installer Hooks

Added SpinShare-owned command detection for generated `spinshare-hook.cjs` and
`spinshare-statusline.cjs` commands. Merging the CLI adapter now replaces old
extension-installed SpinShare hooks with the current CLI hook commands instead
of leaving both active. Removal also deletes all SpinShare-owned hook/statusLine
entries while preserving unrelated user settings/hooks.

## Bug Fix Plan 2026-06-15 Same-Session Stale State

Generated hooks currently reuse an active state whenever the state belongs to
the same Claude `session_id`. That is correct for duplicate display events in a
single turn, but wrong when a previous turn missed `Stop` and the user submits a
new prompt in the same Claude session. The new turn can inherit the old
campaign and old `startedAtMs`.

Fix strategy: make `UserPromptSubmit` reset any existing active state before
fetching a new ad. Keep the current `MessageDisplay` early return for matching
active state so the same turn does not double-fetch.

## Bug Fix Implemented 2026-06-15 Same-Session Stale State

Generated hook scripts now treat `UserPromptSubmit` as a new turn boundary:
they clear any existing active state and fetch/write a fresh ad. Matching
`MessageDisplay` events still return early, so a single turn does not
double-fetch.

## Implemented Change 2026-06-15 Colorized Clickable StatusLine

Generated statusLine output now wraps `$ <adText>` in bold cyan ANSI color. If
the active ad includes `destinationUrl`, the styled text remains wrapped in an
OSC8 hyperlink so supported terminals can open the click-through URL.

The npm CLI can install the same visible/clickable Claude Code surface as the
extension, but Claude Code still controls where the statusLine is rendered.

## Bug Fix Plan 2026-06-16 FORCE_HYPERLINK Parity

Root cause: the VS Code extension adapter sets `env.FORCE_HYPERLINK = "1"` in
merged Claude settings so Claude Code statusLine preserves OSC8 clickable links
in Windows Terminal and other terminals that otherwise strip hyperlink escape
sequences. The npm CLI adapter generates the same OSC8 statusLine output but
does not add the env setting, so npm-only installs can render colored text that
is not clickable even when the destination URL exists.

Fix strategy: update CLI `mergeClaudeCodeSettings()` to preserve existing
settings/env values and set `FORCE_HYPERLINK` to `"1"` when absent or different.
Do not touch unrelated env keys. Add RED coverage before implementation.

Regression risk: only Claude Code settings merge output changes. Removal should
continue to remove statusLine/hooks only and preserve user settings.

## Bug Fix Implemented 2026-06-16 FORCE_HYPERLINK Parity

`mergeClaudeCodeSettings()` now merges `settings.env` and sets
`FORCE_HYPERLINK` to `"1"` while preserving unrelated environment keys. This
matches the VS Code extension adapter and improves OSC8 clickable ad behavior
for npm-only Claude Code installs.

RED verification before implementation:
`corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts`
failed because the merged settings preserved `FORCE_HYPERLINK: "0"`.

GREEN verification after implementation:
`corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts`
passed 10 tests.

Related verification:
`corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts src/index.test.ts src/credential-store.test.ts`
passed 3 files / 23 tests, and
`corepack pnpm@9.12.0 --filter @spinshare/cli lint` passed.

## Bug Fix Plan 2026-06-17 Expiring Active StatusLine State

Generated statusLine output currently renders any `active: true` state until a
`Stop`/`StopFailure` hook clears the state file. There are two related ways the
ad can remain visible after loading has ended: a missed stop hook, or a
post-stop `MessageDisplay` hook that starts a fresh ad after the response is
already displayed.

Fix strategy: make only `UserPromptSubmit` start a new ad; keep `MessageDisplay`
installed as a no-op/compatibility hook so older settings are replaced but
cannot start a post-loading ad. Also write an `expiresAtMs` field with active ad
state and have the generated statusLine script treat expired active state as
hidden. Keep normal `Stop` tracking unchanged; expiry is only a fallback for
missed/failed stop hooks.

Regression risk: setting the fallback expiry too low can hide ads during long
Claude turns. Use a conservative 2 minute expiry so normal long thinking keeps
showing while stale state cannot survive indefinitely.

## Bug Fix Implemented 2026-06-17 Expiring Active StatusLine State

Generated hook scripts now start ads only on `UserPromptSubmit`; `MessageDisplay`
returns without fetching so a post-response display event cannot recreate ad
state after `Stop` clears it. Active state now includes `expiresAtMs`, and
generated statusLine output hides expired state as a fallback for missed
`Stop`/`StopFailure` hooks. `trackIfViewable()` caps reported duration at
`expiresAtMs` when present.

Verification:
`corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts`
passed 10 tests.

## Bug Fix Implemented 2026-06-17 Strict Hook Credential Matching (no prod fallback)

Generated hook `credentialMatchesBaseUrl()` previously treated a **missing**
credential `baseUrl` as matching production (`https://www.spinshare.dev`). Combined
with the single shared `credentials.json`, a local setup's token (or an untagged
one) could be used by a production-baked hook, so local ad activity was reported
to production. The hook now uses the stored token **only** when its `baseUrl`
exactly equals the hook's baked `baseUrl` (`credentialBaseUrl.length > 0 &&` exact
match) — a missing/mismatched `baseUrl` yields no token and the hook reports
nothing. Mirrored identically in the VS Code extension adapter.

Verification:
`corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts src/credential-store.test.ts`
passed 24 tests; the extension adapter test passed 11.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Strict hook credential matching: removed the production fallback for an untagged/mismatched baseUrl (Bug B). | Claude |
| 2026-06-17 | Implemented expiring generated statusLine state and MessageDisplay no-op. | Codex |
| 2026-06-17 | Planned expiring generated statusLine state to prevent ads persisting after loading. | Codex |
| 2026-06-16 | Implemented FORCE_HYPERLINK env parity for npm CLI Claude Code adapter. | Codex |
| 2026-06-16 | Planned FORCE_HYPERLINK env parity for npm CLI Claude Code adapter. | Codex |
| 2026-06-16 | Implemented baseUrl-aware credential file reading for prod/local hook separation. | Codex |
| 2026-06-16 | Planned baseUrl-aware credential file reading for prod/local hook separation. | Codex |
| 2026-06-15 | Colorized generated statusLine output while preserving OSC8 links. | Codex |
| 2026-06-15 | Implemented same-session stale state reset. | Codex |
| 2026-06-15 | Planned same-session stale state reset. | Codex |
| 2026-06-15 | Implemented duplicate cross-installer hook cleanup. | Codex |
| 2026-06-15 | Planned duplicate cross-installer hook cleanup. | Codex |
| 2026-06-15 | Implemented authenticated `/api/ad` fetch for pending campaign continuity. | Codex |
| 2026-06-15 | Planned authenticated `/api/ad` fetch for pending campaign continuity. | Codex |
| 2026-06-15 | Implemented reversible CLI Claude Code adapter removal. | Codex |
| 2026-06-15 | Planned reversible CLI Claude Code adapter removal. | Codex |
| 2026-06-15 | Planned Windows BOM-safe Claude settings parsing fix. | Codex |
| 2026-06-15 | Implemented Windows BOM-safe Claude settings parsing fix. | Codex |
| 2026-06-15 | Implemented CLI Claude Code adapter installer. | Codex |
| 2026-06-15 | Created doc before adding CLI Claude Code adapter installer. | Codex |
