# wrap.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Runs the SpinShare CLI wrapper around a child command and coordinates ad display
with impression reporting.

## What It Does

- Spawns a target command and pipes stdout through `SpinnerRenderer`.
- For interactive agents, runs the target inside a pseudo-terminal so the child still sees TTY semantics while SpinShare observes output.
- Tracks contiguous spinner wait states.
- Reports impressions through the injected API client.
- Preserves child exit-code behavior.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `WaitStateTracker` | Class | Pure wait-state state machine. |
| `countImpressions` | Function | Counts qualifying impressions for a frame sequence. |
| `runWrap` | Function | Runs the child process wrapper. |

## Dependencies

- Internal: `./renderer.js`, `./api-client.js`.
- External: `node:child_process`, `node:os`, `@spinshare/core` types.
- External: optional PTY runtime `@homebridge/node-pty-prebuilt-multiarch`.

## Important Notes / NEVER Change

- The wrapper must not block the child output stream on tracking requests.
- No ad means no impression.
- Child exit code and signal mapping must remain unchanged.
- On Windows, npm-style `.cmd` agent launchers must be spawnable when the wrapper receives a bare command like `claude`.
- Interactive CLIs must not be launched through plain pipes; they need a PTY so commands like Claude Code do not switch into non-interactive print behavior.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-15 | Claude Code interactive loading (`Pollinating...`) showed no SpinShare ads after the zero-argument passthrough fix. | The passthrough avoided breaking Claude but also skipped the wrapper entirely; the original pipe-based wrapper could observe output but broke TTY-sensitive CLIs. | Add a PTY-backed wrapper path that preserves interactive TTY semantics while still running output through `SpinnerRenderer`. |

## Planned Change (2026-06-15)

Add an injectable PTY runner to `runWrap`. When PTY support is available, use it
for wrapped agent commands so stdin stays connected, terminal output remains
interactive, and output can still be classified for ad rendering. Keep the
existing pipe implementation as a fallback for environments where PTY support is
unavailable.

## Implemented Change (2026-06-15)

`runWrap` now loads `@homebridge/node-pty-prebuilt-multiarch` by default and
spawns wrapped commands inside a PTY. PTY output is sent through the same
renderer/impression tracker as the pipe fallback. PTY stdin is forwarded from
the wrapper process, TTY raw mode is restored on exit, terminal resize events
are forwarded when available, and Windows commands are launched through
`cmd.exe /d /s /c` so `.cmd` agent launchers resolve.

## Verification (2026-06-15)

- Red focused CLI run failed because the injected PTY test still returned the
  old spawn path exit code.
- Green focused CLI run passed: `renderer.test.ts` and `wrap.test.ts`, 31 tests.
- Full CLI tests passed: 10 files, 77 tests.
- CLI type check passed.
- Packaged CLI smoke check passed: `node .\vscode-extension\cli-wrapper\dist\index.js --help`.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-14 | Extension terminal shim reached the CLI wrapper, but the wrapper failed with `spawn claude ENOENT` when the real agent was a `.cmd` file. | `child_process.spawn` was called without a Windows shell, which cannot launch `.cmd`/`.bat` targets from a bare command name. | Add a platform-specific spawn option helper that enables `shell` on Windows only. |

## Planned Change

Change wait-state impression reporting from "first spinner frame" to "first
time a spinner run reaches the 3-second viewability floor":

- expose an injectable clock for pure tests
- keep one impression per qualifying contiguous wait state
- cancel/reset without reporting when a wait state ends before 3000 ms
- have `runWrap` wait for the threshold before calling `reportImpression`

## Implemented Change

`WaitStateTracker` now records wait start time, emits one impression only after
the run reaches 3000 ms, and exposes `qualify()` so quiet waits can count via a
timer. `runWrap` schedules a 3000 ms report at wait start, clears it when output
resumes, and sends `viewDurationMs` only for eligible waits.

`spawnOptionsForPlatform` now enables `shell: true` on Windows only, allowing the
wrapper to launch `.cmd`/`.bat` agent commands such as npm-installed `claude`
while preserving direct spawn behavior on POSIX platforms.

## Planned Change 2026-06-15 Cumulative Viewability

Report short wait segments instead of discarding them. When a spinner wait ends
before local 3 seconds, send the observed duration so the backend can accumulate
progress. When the fetched ad includes `remainingViewDurationMs`, schedule the
timer for that remaining duration rather than always 3000 ms.

## Implemented Change 2026-06-15 Cumulative Viewability

`WaitStateTracker.finish()` now returns the final active wait segment. `runWrap`
reports that segment even when it is shorter than 3000 ms; the backend decides
whether this is only progress or a settled paid impression. If `/api/ad` returns
`remainingViewDurationMs`, the wrapper schedules the report timer for that
remaining time. If `/api/track` returns `recorded:false`, the cached ad metadata
is updated so the next wait continues the same campaign. If it returns
`recorded:true`, the wrapper refreshes the ad cache for the next wait.

## Verification

- Focused cumulative viewability CLI run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/api-client.test.ts src/wrap.test.ts`
  (2 files, 35 tests).
- Initial CLI focused run failed on immediate-report behavior and old API
  payload shape.
- Final focused CLI run passed: 3 files, 30 tests.
- Full root test run passed, including CLI 9 files and 68 tests.
- Windows spawn regression red test failed before implementation, then focused
  `wrap.test.ts` passed after adding `spawnOptionsForPlatform`.
- Full CLI lint, tests, and build passed after the Windows spawn fix.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented cumulative viewability segment reporting. | Codex |
| 2026-06-15 | Planned cumulative viewability segment reporting. | Codex |
| 2026-06-15 | Implemented PTY-backed wrapper path for interactive CLIs. | Codex |
| 2026-06-15 | Planned PTY-backed interactive wrapper for Claude/Gemini-style CLIs. | Codex |
| 2026-06-14 | Document Windows `.cmd` spawn support needed by extension terminal shims. | Codex |
| 2026-06-13 | Created doc before adding CLI 3-second viewability logic. | Codex |
| 2026-06-13 | Synced doc with implemented CLI delayed viewability reporting. | Codex |
