# harness.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Starts and stops a real Next.js server for the web end-to-end settlement tests.

## What It Does

- Finds an ephemeral local port.
- Spawns `next dev` by default, or `next start` when `SPINSHARE_E2E_NEXT_CMD=start`.
- Polls `/api/health` until the app is ready or the 60-second startup budget expires.
- Exposes a `stop()` function so tests can tear down the spawned server.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `STARTUP_TIMEOUT_MS` | constant | Readiness timeout for the e2e server. |
| `RunningApp` | interface | Started app handle with `baseUrl`, `port`, and `stop()`. |
| `StartAppOptions` | interface | Startup environment, timeout, and port overrides. |
| `TerminateProcessTreeOptions` | interface | Teardown timeout overrides. |
| `getFreePort` | function | Asks the OS for a currently-free local port. |
| `startApp` | function | Starts Next.js and returns a ready app handle. |
| `terminateProcessTree` | function | Bounded child-process teardown helper used by `stop()`. |

## Dependencies

- **Internal:** `web/node_modules/next/dist/bin/next` - spawned as the server under test.
- **External:** Node `child_process`, `events`, `net`, `path`, `url` - process orchestration and port selection.

## Important Notes / NEVER Change

- Preserve the 60-second readiness failure behavior required by Requirement 11.8.
- Keep e2e defaults credential-free: `SPINSHARE_MODE=local`, mock Stripe/auth, memory counters.
- Teardown must not hang the Vitest process, and must avoid terminating the test runner itself.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | E2E settlement assertions pass, but the e2e command exits nonzero or hangs during teardown on Windows. | Server teardown relies on `taskkill /T /F` and waits indefinitely for the child exit event; this can destabilize the test runner or leave the run without a normal Vitest summary. | Add a focused teardown regression test and replace teardown with a bounded helper that tries graceful termination first, escalates only if needed, and never waits forever. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for harness teardown fix plan. | Codex |
| 2026-06-13 | Implemented bounded `terminateProcessTree` and wired `stop()` through it. | Codex |
