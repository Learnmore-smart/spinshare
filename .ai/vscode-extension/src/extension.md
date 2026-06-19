# extension.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

VS Code extension activation entry point.

## What It Does

- Wires `AuthManager`, `AdApiClient`, and `AdController`.
- On activation: loads cached token, then prompts sign-in when unauthenticated (Requirement 6.4).
- Registers commands for sign-in/out and generation lifecycle hooks.

## Planned Changes (2026-06-14)

- After `auth.initialize()`, call `ensureAuthenticated()` when no token is stored so fresh installs prompt immediately.
- Install SpinShare terminal auto-wrap on activation so new integrated terminals resolve configured AI agent commands like `claude` through SpinShare before the real command runs.
- Register a manual rebuild command for refreshing generated terminal shims after configuration changes.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-19 | Ads worked in terminal Claude CLI but not in Claude Code's VS Code extension UI. | The extension installed Claude hooks/statusLine but did not observe the generated state file; Claude's VS Code webview does not expose a stable third-party injection point. | Wire activation to start a SpinShare state bridge after installing the Claude Code adapter, mirroring active hook state into VS Code notifications. |
| 2026-06-15 | Fresh 0.2 installs in this workspace could fail sign-in with `device/start failed (405)`. | Workspace configuration overrode the packaged default with the redirecting apex host. | Normalize configured production base URLs before constructing the API client and terminal auto-wrap launcher. |
| 2026-06-14 | Typing `claude` in the integrated terminal still showed Claude's loading text instead of SpinShare ads. | The extension only exposed manual notification-based generation commands and never altered terminal command resolution. | Wire activation to install PATH shims for configured terminal agents. |

## Planned Change (2026-06-15)

Use the extension API client's base URL normalizer when reading
`spinshare.baseUrl` during activation and terminal shim refresh.

## Planned Change (2026-06-15 Claude Code Adapter)

On activation, install the Claude Code adapter when enabled. This writes generated hook/statusLine scripts under extension global storage and safely patches `~/.claude/settings.json`. Terminal shims remain responsible for no-touch `claude` launch; Claude hooks/statusLine become the first-class lifecycle/display integration.

## Implemented Change (2026-06-15 Claude Code Adapter)

Activation now calls `installClaudeCodeAdapter()` and refreshes it when `spinshare.baseUrl` or `spinshare.claudeCodeAdapter` changes.

Activation also wires `FileTokenMirror` into `AuthManager`, so extension sign-in writes the same fallback credential file the generated Claude hook script can read.

## Planned Change (2026-06-15 Claude Code Adapter Removal)

Register a command palette command that removes the SpinShare Claude Code
adapter from `~/.claude/settings.json` and cleans generated adapter files on a
best-effort basis. This gives users a reversible path for the default-on
automatic install.

## Implemented Change (2026-06-15 Claude Code Adapter Removal)

Registered `spinshare.removeClaudeCodeAdapter`. Disabling
`spinshare.claudeCodeAdapter` now removes the current adapter instead of only
stopping future installs.

## Implemented Change (2026-06-15)

Activation now normalizes the configured `spinshare.baseUrl` before creating
`AdApiClient`, and the terminal auto-wrap refresh path normalizes the same
setting before writing launcher environment values.

## Planned Change 2026-06-15 Persistent Sign-In Entry

Fresh VSIX installs may not visibly prompt sign-in in the current window:
`onStartupFinished` only runs when the extension activates, and the one-shot
modal prompt can be missed or hidden. Add a persistent status bar sign-in entry
that is shown whenever activation finds no token. Keep the existing automatic
prompt, but do not rely on it as the only sign-in surface.

The status item should:

- show only when unauthenticated;
- run `spinshare.signIn`;
- hide after a successful activation prompt or manual sign-in;
- show again after sign-out.

## Implemented Change 2026-06-15 Persistent Sign-In Entry

Activation now creates a right-aligned status bar item with text
`$(account) SpinShare Sign in`, tooltip copy, and command
`spinshare.signIn`. The item is shown when activation finds no stored token,
hidden after a successful activation prompt or manual sign-in, and shown again
after sign-out or auth initialization failure.

The existing automatic prompt remains, but it is no longer the only visible
sign-in surface after installing the extension.

## Implemented Change 2026-06-19 Claude Code State Bridge

Activation now starts `ClaudeCodeStateBridge` after a successful
`installClaudeCodeAdapter()` call, using the returned `stateFilePath`. When
`spinshare.claudeCodeAdapter` is disabled, activation disposes the bridge before
removing the adapter. The bridge is also disposed with the extension.

## Verification (2026-06-15)

- Extension TypeScript build passed as part of `corepack pnpm@9.12.0 --filter ./vscode-extension package`.
- Full extension test suite passed with `corepack pnpm@9.12.0 test` from `vscode-extension`.

## Implemented Change

- Activation now installs terminal auto-wrap shims using `context.environmentVariableCollection`.
- Configuration changes to `spinshare.baseUrl`, `spinshare.terminalAutoWrap`, or `spinshare.terminalAgents` refresh the generated shims.
- `spinshare.rebuildTerminalShims` manually regenerates the shims and tells the user to open a new terminal.

## Verification

- Extension build passed.
- Full extension test suite passed.
- Generated shim smoke tests passed, including a LearnX ad render through the shim path.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented Claude Code state bridge activation wiring. | Codex |
| 2026-06-19 | Planned Claude Code state bridge activation for VS Code extension sessions. | Codex |
| 2026-06-16 | Activation now passes the normalized baseUrl into FileTokenMirror for prod/local hook credential separation. | Codex |
| 2026-06-15 | Implemented persistent sign-in status entry on activation. | Codex |
| 2026-06-15 | Planned persistent sign-in status entry on activation. | Codex |
| 2026-06-15 | Implemented command palette removal path for Claude Code adapter. | Codex |
| 2026-06-15 | Planned command palette removal path for Claude Code adapter. | Codex |
| 2026-06-15 | Wired FileTokenMirror into extension auth. | Codex |
| 2026-06-15 | Wired Claude Code adapter install into extension activation. | Codex |
| 2026-06-15 | Planned activation wiring for Claude Code hooks/statusLine adapter. | Codex |
| 2026-06-15 | Normalized configured production base URLs during activation and terminal shim refresh. | Codex |
