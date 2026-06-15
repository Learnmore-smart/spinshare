# terminal-auto-wrap.ts

> Last updated: 2026-06-14 | Protection: STANDARD

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

## Planned Changes

| Date | Change | Author |
|------|--------|--------|
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
