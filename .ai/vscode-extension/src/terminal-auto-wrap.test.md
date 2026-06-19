# terminal-auto-wrap.test.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Unit tests for the SpinShare terminal auto-wrap shim planner.

## What It Does

- Verifies configured agent names are sanitized and deduplicated.
- Verifies the generated launcher removes the shim directory from `PATH` before spawning the real agent.
- Verifies the terminal environment mutation prepends the shim directory with the platform path delimiter.
- Verifies Windows and POSIX shim files are generated for configured agents.
- Verifies Antigravity CLI default shims are generated for `agy` and
  `antigravity`.

## Dependencies

- Internal: `terminal-auto-wrap.ts`.
- External: Vitest.

## Planned Changes

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Add red tests for the missing extension auto-wrap behavior before implementing production code. | Codex |

## Implemented Test

- Covers safe command-name normalization and fallback to `claude`.
- Covers launcher content for recursive PATH removal and SpinShare API URL forwarding.
- Covers shim file generation for Windows and POSIX shells.
- Covers environment collection clearing and PATH prepending.

## Verification

- Initial red run failed loading `./terminal-auto-wrap`.
- Final focused run passed: 5 tests.

## Planned Fix (2026-06-15)

Add red assertions that the generated launcher prefers the bundled extension CLI path before repo-local fallback paths, so a packaged VSIX install can auto-wrap new integrated terminals without a separate CLI install.

## Historical Planned Fix (2026-06-15, Superseded)

Replace the prior zero-argument bypass assertion with a regression test proving
the launcher does not bypass SpinShare for plain `claude`. The interactive TTY
compatibility belongs in the CLI wrapper PTY path, not in the extension launcher.

## Planned Fix (2026-06-15)

Add red regression coverage for the new Claude Code adapter boundary: generated
terminal launchers must direct-launch `claude` as a native adapter agent, while
keeping the SpinShare CLI wrapper for non-native fallback agents.

## Implemented Test (2026-06-15)

The launcher regression test now asserts that generated scripts include
`nativeAdapterAgents` with `claude`, branch on that set, direct-spawn the agent,
and still preserve the wrapper call for fallback agents.

## Planned Test 2026-06-19 Antigravity CLI defaults

Add a red regression test proving that the default terminal auto-wrap plan emits
Windows, PowerShell, and POSIX shims for Antigravity's observed `agy` command and
the longer `antigravity` command. Keep the test separate from configured-agent
coverage so the package default cannot silently regress back to Claude-only.

## Implemented Test 2026-06-19 Antigravity CLI defaults

Added coverage that `DEFAULT_TERMINAL_AGENTS` and fallback normalization include
`claude`, `agy`, and `antigravity`; the default generated plan includes shim
files for both Antigravity aliases; and `package.json` contributes the same
default `spinshare.terminalAgents` list.

Verification:
- RED: focused extension terminal-auto-wrap test failed on missing `agy`,
  missing `antigravity`, and Claude-only manifest defaults.
- GREEN: `corepack pnpm@9.12.0 test -- src/terminal-auto-wrap.test.ts` from
  `vscode-extension` passed 11 tests.

## Verification (2026-06-15)

- Red: `src/terminal-auto-wrap.test.ts` failed before the native adapter branch
  existed.
- Green: the same focused test passed after the branch was implemented.

## Historical Implemented Test (2026-06-15, Superseded)

Superseded: the zero-argument bypass test must be removed because it hides ads
for interactive agent sessions.

## Historical Implemented Test (2026-06-15, Superseded)

Replaced the bypass assertion with a test proving the launcher does not contain
the `args.length === 0` branch and still passes `[...commandArgs, agent,
...args]` to SpinShare. Added a bundling-script assertion for the PTY runtime
copy.

## Historical Verification (2026-06-15, Superseded)

- Red focused extension run failed on the bypass branch and missing PTY copy.
- Green focused extension run passed with 9 tests.
- Full extension test run passed with 35 tests.

## Historical Verification (2026-06-15, Superseded)

- Red: `src/terminal-auto-wrap.test.ts` failed on the missing passthrough branch.
- Green: focused terminal auto-wrap test passed with 8 tests.
- Full extension test suite passed with 34 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Added Antigravity default shim regression coverage. | Codex |
| 2026-06-19 | Planned Antigravity default shim regression coverage. | Codex |
| 2026-06-15 | Implemented native Claude direct-launch regression test. | Codex |
| 2026-06-15 | Planned native Claude direct-launch regression test. | Codex |
| 2026-06-15 | Added launcher/no-bypass and PTY packaging regression coverage. | Codex |
| 2026-06-15 | Planned removal of zero-argument bypass regression test. | Codex |
| 2026-06-15 | Added regression coverage for zero-argument interactive passthrough. | Codex |
| 2026-06-15 | Planned regression coverage for zero-argument interactive passthrough. | Codex |
| 2026-06-15 | Documented bundled CLI launcher test plan. | Codex |
