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
| 2026-06-15 | Fresh 0.2 installs in this workspace could fail sign-in with `device/start failed (405)`. | Workspace configuration overrode the packaged default with the redirecting apex host. | Normalize configured production base URLs before constructing the API client and terminal auto-wrap launcher. |
| 2026-06-14 | Typing `claude` in the integrated terminal still showed Claude's loading text instead of SpinShare ads. | The extension only exposed manual notification-based generation commands and never altered terminal command resolution. | Wire activation to install PATH shims for configured terminal agents. |

## Planned Change (2026-06-15)

Use the extension API client's base URL normalizer when reading
`spinshare.baseUrl` during activation and terminal shim refresh.

## Implemented Change (2026-06-15)

Activation now normalizes the configured `spinshare.baseUrl` before creating
`AdApiClient`, and the terminal auto-wrap refresh path normalizes the same
setting before writing launcher environment values.

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
| 2026-06-15 | Normalized configured production base URLs during activation and terminal shim refresh. | Codex |
