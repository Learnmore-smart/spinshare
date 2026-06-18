# smoke-local-sample.mjs

> Last updated: 2026-06-17 | Protection: STANDARD

## Purpose

Runs a real localhost smoke test for the sample development server used by the
local extension package.

## What It Does

- Starts `web/scripts/dev-local-sample.mjs`.
- Waits for `GET /api/health` to return ok.
- Fetches `GET /api/market`.
- Verifies the market contains the seeded local sample campaign instead of
  timing out or returning Firestore/provider errors.
- Signs in with the fixed local developer credentials, approves a device flow,
  polls a `Device_Auth_Token`, and verifies authenticated `GET /api/ad` returns
  the same local sample campaign with a tracked click URL.
- Stops the spawned dev server process tree after success or failure.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `isLocalSampleMarketResponse` | function | Validates the market response shape and seeded campaign identity. |
| `isLocalSampleAdResponse` | function | Validates authenticated ad response for the seeded sample campaign. |
| `summarizeLocalSampleMarket` | function | Returns a compact reader-facing summary of the smoke response. |
| `summarizeLocalSampleAd` | function | Returns a compact summary of the authenticated ad response. |
| `runLocalSampleSmoke` | function | Starts the server, verifies health/market, and cleans up. |
| CLI | command | `node web/scripts/smoke-local-sample.mjs` |

## Dependencies

- Internal: `web/scripts/dev-local-sample.mjs`.
- External: Node built-in `child_process`, `node:url`, and global `fetch`.

## Important Notes / NEVER Change

- This smoke must only verify local sample behavior; do not point it at
  production by default.
- The expected campaign should stay local-branded (`cmp-local-demo`,
  `SpinShare Local`) so smoke output cannot be mistaken for real paid ads.
- Always attempt to stop the spawned process tree in `finally`.

## Planned Change 2026-06-17

Add the smoke script after discovering that `dev:sample` could return
`/api/health` while `/api/market` still hit external Firestore and failed after
~42 seconds. Unit tests should cover the response validator before the script is
implemented; the real smoke command should then prove the localhost runtime path.

## Planned Fix 2026-06-17: Exit After Successful Smoke

Bug: the first real `corepack pnpm@9.12.0 smoke:local-sample` run printed both
successful health and market summaries, but the command did not exit before the
180s tool timeout. The spawned Next process was gone afterward, so the remaining
problem is process-handle/pipe cleanup in the smoke script.

Fix plan:

- Expose a small pure helper that describes the platform-specific process-tree
  kill command.
- Use `taskkill.exe /pid <pid> /t /f` on Windows and `SIGTERM` elsewhere.
- After requesting stop, destroy child stdio streams and wait briefly for the
  `close` event so the Node event loop can exit.

## Implemented Change 2026-06-17

Added `web/scripts/smoke-local-sample.mjs`. The CLI starts
`web/scripts/dev-local-sample.mjs`, waits for `/api/health`, fetches
`/api/market`, verifies the seeded `cmp-local-demo` local campaign, prints
compact JSON summaries, and stops the spawned process tree.

## Planned Extension 2026-06-17: Authenticated Local Ad Smoke

Manual HTTP probe confirmed the local sample runtime can:

1. fetch `/api/auth/csrf`;
2. sign in through NextAuth credentials as `developer@spinshare.test`;
3. start and approve a device flow;
4. poll a `Device_Auth_Token`;
5. call authenticated `GET /api/ad`;
6. receive `cmp-local-demo` with a tracked `/api/click` destination.

Add this to the smoke script so local extension/CLI preconditions are verified
automatically, without adding any production backdoor.

## Planned Fix 2026-06-17: Device Start Must POST

Bug: first real authenticated smoke failed with
`/api/auth/device/start returned 405` because the script reused `fetchJson()`
without overriding the default GET method. The device start route only accepts
POST.

Fix plan:

- Add a tiny JSON POST request-init helper covered by tests.
- Use it for device start, device approve, and device token poll calls.

The root `package.json` now exposes:

```powershell
corepack pnpm@9.12.0 smoke:local-sample
```

## Implemented Fix 2026-06-17: Exit After Successful Smoke

Added `processTreeKillCommand(platform, pid)` and Windows cleanup through
`taskkill.exe /pid <pid> /t /f` with a 5-second timeout. The CLI entrypoint now
explicitly exits `0` after a successful smoke and `1` after a failure, so the
command does not hang after printing success.

## Implemented Extension 2026-06-17: Authenticated Local Ad Smoke

The smoke now signs in through local NextAuth credentials as
`developer@spinshare.test`, starts a device flow, approves the user code with
the signed-in browser session cookie, polls the device token, and calls
authenticated `GET /api/ad`. It verifies the ad is the seeded local campaign and
that the destination is a tracked local `/api/click` URL.

The CLI output now includes:

- `health=...`
- `market=...`
- `ad=...`

This proves the localhost sample server can support the local extension/CLI
precondition: an authenticated device token can fetch the local sample ad.

## Implemented Fix 2026-06-17: Device Start Must POST

Added `jsonPostInit()` and used it for device start, device approve, and device
token poll requests. This fixed the first authenticated smoke failure where
`/api/auth/device/start` returned `405` because the script had sent GET.

## Verification 2026-06-17

- RED: `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\smoke-local-sample.test.mjs`
  failed because `smoke-local-sample.mjs` did not exist.
- GREEN: the same focused command passed with 3 tests after implementation.
- RED cleanup regression: the focused test failed because
  `processTreeKillCommand` was not exported.
- GREEN cleanup regression: the focused command passed with 4 tests.
- Real smoke passed and exited `0`:
  `corepack pnpm@9.12.0 smoke:local-sample`.
- Related script tests passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\dev-local-sample.test.mjs ..\web\scripts\smoke-local-sample.test.mjs`
  with 2 files / 7 tests.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- Post-smoke check confirmed `http://127.0.0.1:3000/api/health` was unreachable,
  so the smoke did not leave a localhost server running.
- RED authenticated helper coverage:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\smoke-local-sample.test.mjs`
  failed because `isLocalSampleAdResponse` was not exported.
- GREEN authenticated helper coverage: the same focused command passed with 5
  tests.
- RED JSON POST coverage: the same focused command failed because
  `jsonPostInit` was not exported.
- GREEN JSON POST coverage: the same focused command passed with 6 tests.
- Final authenticated real smoke passed and exited `0`:
  `corepack pnpm@9.12.0 smoke:local-sample`, printing `health`, `market`, and
  `ad` summaries.
- Final related script tests passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\dev-local-sample.test.mjs ..\web\scripts\smoke-local-sample.test.mjs`
  with 2 files / 9 tests.
- Final web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented authenticated local ad smoke and JSON POST fix. | Codex |
| 2026-06-17 | Planned JSON POST helper for device smoke. | Codex |
| 2026-06-17 | Planned authenticated local ad smoke extension. | Codex |
| 2026-06-17 | Implemented local sample smoke script and cleanup fix. | Codex |
| 2026-06-17 | Planned smoke script process cleanup fix. | Codex |
| 2026-06-17 | Planned local sample smoke script. | Codex |
