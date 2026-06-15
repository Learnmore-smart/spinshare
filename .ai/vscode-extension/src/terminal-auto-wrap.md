# terminal-auto-wrap.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Installs SpinShare terminal shims so configured AI agent commands entered in new integrated terminals run through the SpinShare CLI wrapper automatically.

## What It Does

- Writes a launcher script and per-agent command shims into extension global storage.
- Prepends the shim directory to the integrated terminal `PATH` through VS Code's environment variable collection.
- The launcher removes the shim directory from `PATH`, then invokes the SpinShare CLI wrapper with the original agent command and arguments.
- Defaults to wrapping `claude`, with additional agent names coming from extension configuration.

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
- Plain zero-argument agent launches must still invoke SpinShare; the CLI
  wrapper is responsible for preserving TTY semantics through a PTY.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-15 | Typing plain `claude` showed Claude's own `Pollinating...` loading text with no SpinShare ad. | The zero-argument launcher branch bypassed SpinShare entirely, so the wrapper never saw the loading output. | Remove the bypass and route plain agent launches through the PTY-backed SpinShare wrapper. |
| 2026-06-15 | Typing plain `claude` after installing 0.2 printed `Input must be provided either through stdin or as a prompt argument when using --print`. | The generated shim launched the SpinShare wrapper, which piped stdout/stderr; Claude treated that as non-interactive print mode and failed without input. | Superseded by the PTY-backed wrapper: keep routing through SpinShare while preserving TTY semantics. |

## Planned Fix (2026-06-15)

Remove the generated-launcher zero-argument passthrough branch. Plain `claude`
must invoke the bundled SpinShare CLI wrapper, and `runWrap` must use a PTY to
preserve interactive behavior.

## Implemented Fix (2026-06-15)

The generated launcher no longer branches on `args.length === 0`. It always
selects the bundled SpinShare CLI when present and invokes it as
`spinshare <agent> ...args`.

## Verification (2026-06-15)

- Red extension focused test failed on the old `if (args.length === 0)` branch.
- Green extension focused test passed with 9 tests.
- Full extension tests passed: 5 files, 35 tests.
- Extension type check passed.

## Planned Fix (2026-06-15)

Add a generated-launcher branch for `args.length === 0` that spawns the real
agent directly with inherited stdio, using a shell on Windows so `.cmd` agents
resolve correctly. Keep wrapped behavior for invocations with arguments.

## Implemented Fix (2026-06-15)

The generated launcher now removes its shim directory from `PATH`, then if no
agent arguments were provided it spawns the real agent directly with inherited
stdio. On Windows that direct interactive launch uses `shell: true` so `.cmd`
agent launchers resolve. Invocations with arguments continue through the
SpinShare wrapper.

## Verification (2026-06-15)

- Red: focused terminal auto-wrap test failed because the launcher had no `args.length === 0` branch.
- Green: focused terminal auto-wrap test passed after adding the passthrough branch.
- Full extension test suite passed.
- Extension TypeScript check passed.

## Planned Fix (2026-06-15)

Bug: installing the extension does not reliably wrap future CLI runs because the generated launcher looks for a repo-local CLI or global `spinshare` command, neither of which exists in a normal VSIX install.

Fix: make the launcher prefer `extensionRoot/cli-wrapper/dist/index.js`, keep `SPINSHARE_CLI_PATH` as an override, and update packaging to bundle that CLI directory.

## Planned Changes

| Date | Change | Author |
|------|--------|--------|
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
