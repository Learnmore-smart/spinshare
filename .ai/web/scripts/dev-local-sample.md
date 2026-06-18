# dev-local-sample.mjs

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Starts the local web app with deterministic sample ads for localhost extension
testing.

## Implemented Change

Create a small Node launcher that spawns `corepack pnpm@9.12.0 --filter
@spinshare/web dev` with:

- `SPINSHARE_MODE=local`
- `AUTH_MODE=mock`
- `STRIPE_MODE=mock`
- `SPINSHARE_COUNTER=memory`
- `SPINSHARE_SEED_LOCAL_DATA=1`
- `NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS=1`
- localhost `NEXTAUTH_URL` and `AUTH_VERIFICATION_URI`

This avoids shell-specific env syntax and works on Windows.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `buildLocalSampleEnv` | Function | Returns the environment for sample local dev. |
| `devLocalSampleCommand` | Function | Returns the Corepack command/args. |
| `devLocalSampleSpawnOptions` | Function | Returns platform-specific spawn options. |
| `node web/scripts/dev-local-sample.mjs` | CLI | Starts local dev with sample data. |

## Planned Fix 2026-06-16 Windows Corepack Spawn

On Windows, `corepack.cmd` should be spawned through the shell. Using
`shell: false` can fail before the local sample server starts, leaving the local
extension pointed at localhost with no ads. Add a platform helper and wire
`runLocalSampleDev()` through it.

## Implemented Fix 2026-06-16 Windows Corepack Spawn

Added `devLocalSampleSpawnOptions(platform)`, returning `shell: true` for
Windows and `shell: false` elsewhere. `runLocalSampleDev()` now spreads that
helper into `spawn()` so the root `dev:sample` script can launch `corepack.cmd`
on Windows.

## Planned Fix 2026-06-16 Local Credentials Flag

Set `NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS=1` in the sample environment so
the client-side `/signin` page exposes the local test-account shortcut needed
to approve extension/CLI device login without OAuth credentials.

## Implemented Fix 2026-06-16 Local Credentials Flag

`buildLocalSampleEnv()` now sets
`NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS=1` alongside mock auth/payment,
memory storage, and seeded sample ads.

## Planned Fix 2026-06-17 Firestore Inheritance

Bug: `dev:sample` spreads the caller's base environment before applying local
sample overrides. If repo-root `.env` contains `SPINSHARE_USE_FIRESTORE=1` or
`FIRESTORE_EMULATOR_HOST`, the sample server can still use Firestore even though
it sets `SPINSHARE_MODE=local`, `STRIPE_MODE=mock`, and `SPINSHARE_COUNTER=memory`.
This makes `/api/market` hit external Google Firestore and fail/timeout instead
of returning the seeded in-memory sample ad.

Fix plan:

- Keep preserving unrelated environment values.
- Explicitly set `SPINSHARE_USE_FIRESTORE=0`.
- Explicitly clear `FIRESTORE_EMULATOR_HOST`.
- Keep sample data in memory only; no localhost sample run should mutate cloud
  Firestore or require the emulator.

Verification plan:

- Add a failing test where the base env includes `SPINSHARE_USE_FIRESTORE=1` and
  `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`; the built sample env must override
  both.
- Re-run the focused launcher test.
- Re-run a real `dev:sample` smoke for `/api/health` and `/api/market`.

## Implemented Fix 2026-06-17 Firestore Inheritance

`buildLocalSampleEnv()` now explicitly sets:

- `SPINSHARE_USE_FIRESTORE=0`
- `FIRESTORE_EMULATOR_HOST=""`

This makes `dev:sample` memory-only even when repo-root `.env` is configured
for namespace-isolated cloud Firestore or a Firestore emulator. It preserves
unrelated environment keys, but local sample ads no longer depend on Google
network access or mutate Firestore.

## Verification 2026-06-17 Firestore Inheritance

- RED: `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\dev-local-sample.test.mjs`
  failed because `buildLocalSampleEnv()` preserved `SPINSHARE_USE_FIRESTORE=1`
  and `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`.
- GREEN: the same focused command passed with 3 tests after the override.
- Real smoke: started `corepack pnpm@9.12.0 dev:sample` via a managed
  PowerShell job, then requested:
  - `GET http://127.0.0.1:3000/api/health` -> `{ status: "ok" }`
  - `GET http://127.0.0.1:3000/api/market` -> one local campaign,
    `cmp-local-demo`, `SpinShare Local - sample ad for localhost testing`,
    `$30.00 / 1k imps`, `$50.00` remaining budget.
- Confirmed the temporary localhost server was stopped after the smoke.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented Firestore inheritance fix for sample dev. | Codex |
| 2026-06-17 | Planned Firestore inheritance fix for sample dev. | Codex |
| 2026-06-16 | Implemented local credentials env flag for sample dev. | Codex |
| 2026-06-16 | Planned local credentials env flag for sample dev. | Codex |
| 2026-06-16 | Implemented Windows shell spawn fix for local sample dev. | Codex |
| 2026-06-16 | Planned Windows shell spawn fix for local sample dev. | Codex |
| 2026-06-16 | Implemented sample local dev launcher. | Codex |
| 2026-06-16 | Planned sample local dev launcher. | Codex |
