# terminal-auto-wrap.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Installs SpinShare terminal shims so configured AI agent commands entered in new integrated terminals run through the SpinShare CLI wrapper automatically.

## What It Does

- Writes a launcher script and per-agent command shims into extension global storage.
- Prepends the shim directory to the integrated terminal `PATH` through VS Code's environment variable collection.
- The launcher removes the shim directory from `PATH`, then invokes the SpinShare CLI wrapper with the original agent command and arguments.
- Defaults to wrapping `claude`, `agy`, and `antigravity`, with additional agent names coming from extension configuration.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `DEFAULT_TERMINAL_AGENTS` | constant | Default terminal commands to auto-wrap. |
| `normalizeTerminalAgents` | function | Sanitizes configured command names into a safe unique list. |
| `buildTerminalAutoWrapPlan` | function | Creates pure file/env operations for tests and installers. |
| `installTerminalAutoWrap` | function | Writes shims and updates terminal environment variables. |

## Dependencies

- Internal: `extension.ts` calls `installTerminalAutoWrap` during activation.
- External: Node `fs/promises`, `path`, `os` for filesystem and platform-specific shims.
- External: VS Code `EnvironmentVariableCollection` for terminal `PATH` mutation.

## Important Notes / NEVER Change

- The launcher must remove its own shim directory from `PATH` before spawning the wrapped command, or `claude` will recursively call the shim.
- This only affects new integrated terminals created after activation/environment refresh.
- Shims must be generated from sanitized command names only.
- Prefer the CLI bundled inside the installed extension before falling back to repo-local or globally installed CLIs.
- Agent commands that have a native SpinShare adapter, starting with `claude`
  via Claude Code hooks/statusLine, must launch the real agent directly after
  removing the shim directory from `PATH`. Those agents should not be routed
  through the stdout/spinner wrapper because the native adapter is the
  authoritative lifecycle source.
- Agents without a native adapter may still use the CLI wrapper fallback.

## Bug Fix Plan 2026-06-19 Antigravity CLI no ads

**Bug:** Antigravity CLI sessions launched as `agy` do not show ads in new VS
Code-compatible integrated terminals.

**Cause:** The terminal auto-wrap default agent list only generates shims for
`claude`. Antigravity has no native hook/statusLine adapter, so it must use the
CLI wrapper fallback, but no `agy` or `antigravity` shim exists by default.

**Fix Strategy:** Add `agy` and `antigravity` to `DEFAULT_TERMINAL_AGENTS` while
keeping `claude` as the only native-adapter direct-launch agent. Tests should
prove the default plan emits Antigravity shim files and the launcher still sends
non-native agents through the SpinShare CLI wrapper.

**Regression Risk:** Only new integrated terminals after environment refresh
see the new shim list. Existing custom `spinshare.terminalAgents` settings still
override the default list.

## Bug Fix Implemented 2026-06-19 Antigravity CLI no ads

`DEFAULT_TERMINAL_AGENTS` now includes `claude`, `agy`, and `antigravity`.
`claude` remains the only native-adapter direct-launch agent; Antigravity
aliases use the existing CLI wrapper fallback.

Verification:
- RED: `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/terminal-auto-wrap.test.ts`
  failed because default shims and manifest defaults were Claude-only.
- GREEN: `corepack pnpm@9.12.0 test -- src/terminal-auto-wrap.test.ts`
  from `vscode-extension` passed 11 tests.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-15 | Typing plain `claude` showed Claude's own `Pollinating...` loading text with no SpinShare ad. | Historical diagnosis before the Claude Code native adapter decision: the zero-argument launcher branch bypassed SpinShare entirely, so the wrapper never saw the loading output. | Superseded. Current rule: `claude` direct-launches the real Claude Code command and ads come from hooks/statusLine. |
| 2026-06-15 | Typing plain `claude` after installing 0.2 printed `Input must be provided either through stdin or as a prompt argument when using --print`. | Historical diagnosis before the Claude Code native adapter decision: the generated shim launched the SpinShare wrapper, which piped stdout/stderr; Claude treated that as non-interactive print mode and failed without input. | Superseded. Current rule: native adapter agents bypass the stdout wrapper; non-native agents may still use the PTY-backed wrapper. |

## Historical Planned Fix (2026-06-15, Superseded)

Remove the generated-launcher zero-argument passthrough branch. Plain `claude`
must invoke the bundled SpinShare CLI wrapper, and `runWrap` must use a PTY to
preserve interactive behavior.

## Historical Implemented Fix (2026-06-15, Superseded)

The generated launcher no longer branches on `args.length === 0`. It always
selects the bundled SpinShare CLI when present and invokes it as
`spinshare <agent> ...args`.

## Historical Verification (2026-06-15, Superseded)

- Red extension focused test failed on the old `if (args.length === 0)` branch.
- Green extension focused test passed with 9 tests.
- Full extension tests passed: 5 files, 35 tests.
- Extension type check passed.

## Historical Planned Fix (2026-06-15, Superseded)

Add a generated-launcher branch for `args.length === 0` that spawns the real
agent directly with inherited stdio, using a shell on Windows so `.cmd` agents
resolve correctly. Keep wrapped behavior for invocations with arguments.

## Historical Implemented Fix (2026-06-15, Superseded)

The generated launcher now removes its shim directory from `PATH`, then if no
agent arguments were provided it spawns the real agent directly with inherited
stdio. On Windows that direct interactive launch uses `shell: true` so `.cmd`
agent launchers resolve. Invocations with arguments continue through the
SpinShare wrapper.

## Historical Verification (2026-06-15, Superseded)

- Red: focused terminal auto-wrap test failed because the launcher had no `args.length === 0` branch.
- Green: focused terminal auto-wrap test passed after adding the passthrough branch.
- Full extension test suite passed.
- Extension TypeScript check passed.

## Planned Fix (2026-06-15)

Bug: installing the extension does not reliably wrap future CLI runs because the generated launcher looks for a repo-local CLI or global `spinshare` command, neither of which exists in a normal VSIX install.

Fix: make the launcher prefer `extensionRoot/cli-wrapper/dist/index.js`, keep `SPINSHARE_CLI_PATH` as an override, and update packaging to bundle that CLI directory.

## Planned Fix (2026-06-15)

Bug: after adding the Claude Code hooks/statusLine adapter, the terminal shim
still routes `claude` through `spinshare claude`, so the old stdout/spinner
guesser can run at the same time as the native Claude Code adapter. That keeps
the brittle path in the MVP and can interfere with Claude's real TUI.

Fix: teach the generated launcher about native adapter agents. For `claude`,
remove the shim directory from `PATH`, set SpinShare base URL env vars, then
spawn the real `claude` directly with inherited stdio. Keep the existing
SpinShare CLI wrapper path as fallback for agents that do not yet have a
native adapter.

## Implemented Fix (2026-06-15)

The generated launcher now has a native adapter agent set containing `claude`.
After removing the shim directory from `PATH` and setting SpinShare base URL
environment variables, `claude` launches the real command directly with
inherited stdio. Other configured agents still use the SpinShare CLI wrapper
fallback.

## Verification (2026-06-15)

- Red: focused terminal auto-wrap test failed because the generated launcher
  had no native adapter agent branch.
- Green: focused terminal auto-wrap test passed after adding the `claude`
  direct-launch branch.

## Planned Changes

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented default Antigravity CLI shims for `agy`/`antigravity`. | Codex |
| 2026-06-19 | Planned default Antigravity CLI shims for `agy`/`antigravity`. | Codex |
| 2026-06-15 | Implemented native Claude Code direct-launch branch in terminal shim launcher. | Codex |
| 2026-06-15 | Planned native Claude Code direct-launch branch in terminal shim launcher. | Codex |
| 2026-06-15 | Removed zero-argument launcher bypass so interactive agents still route through SpinShare. | Codex |
| 2026-06-15 | Implemented zero-argument interactive agent passthrough. | Codex |
| 2026-06-15 | Planned zero-argument interactive agent passthrough. | Codex |
| 2026-06-15 | Documented bundled-CLI launcher fix. | Codex |
| 2026-06-14 | Create terminal auto-wrap helper for shim generation, recursive-path prevention, and VS Code terminal environment registration. | Codex |

## Implemented Change

- Added `buildTerminalAutoWrapPlan` to generate a launcher and Windows/POSIX shims.
- Added `installTerminalAutoWrap` to write shims into global storage and prepend their directory to terminal `PATH`.
- The generated launcher sets the SpinShare base URL, removes the shim directory from `PATH`, and invokes the local CLI wrapper when available.

## Verification

- Red test first failed because `./terminal-auto-wrap` did not exist.
- Focused extension test passed: `src/terminal-auto-wrap.test.ts`.
- Smoke test passed with a generated `claude.cmd` shim forwarding to a fake real command.
- Full ad smoke test passed against local `/api/ad`, rendering the LearnX ad through the generated shim path.
