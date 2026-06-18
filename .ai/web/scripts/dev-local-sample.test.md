# dev-local-sample.test.mjs

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Tests the sample local dev launcher helpers.

## Planned Coverage

- Environment builder enables local mock mode and sample seed data.
- Existing unrelated environment values are preserved.
- Command builder uses `corepack pnpm@9.12.0 --filter @spinshare/web dev`.
- Spawn options use `shell: true` on Windows so `corepack.cmd` can launch.
- Sample env exposes local credentials UI via
  `NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS=1`.

## Implemented Coverage

Tests cover the local mock/sample environment and platform-specific Corepack
command selection.

## Planned Fix Coverage 2026-06-16 Windows Corepack Spawn

Add a failing test for `devLocalSampleSpawnOptions("win32")` so the launcher
cannot regress to `shell: false` on Windows.

## Implemented Fix Coverage 2026-06-16 Windows Corepack Spawn

The test suite now imports `devLocalSampleSpawnOptions()` and verifies Windows
uses `shell: true` while Linux uses `shell: false`.

## Planned Fix Coverage 2026-06-16 Local Credentials Flag

Extend the sample env test so it requires
`NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS=1`; this fails before the launcher
sets the client-visible flag.

## Implemented Fix Coverage 2026-06-16 Local Credentials Flag

The sample env test now asserts
`NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS=1` is present in the launcher
environment.

## Planned Fix Coverage 2026-06-17 Firestore Inheritance

Add a regression test where the base environment contains cloud/emulator
Firestore settings. `buildLocalSampleEnv()` must force the local sample server
back to in-memory durable storage by setting `SPINSHARE_USE_FIRESTORE=0` and
clearing `FIRESTORE_EMULATOR_HOST`.

## Implemented Fix Coverage 2026-06-17 Firestore Inheritance

The first env-builder test now seeds the base env with
`SPINSHARE_USE_FIRESTORE=1` and `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, then
asserts the sample env overrides them to `SPINSHARE_USE_FIRESTORE=0` and an
empty `FIRESTORE_EMULATOR_HOST`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Added Firestore inheritance regression. | Codex |
| 2026-06-17 | Planned Firestore inheritance regression. | Codex |
| 2026-06-16 | Added sample local credentials env flag coverage. | Codex |
| 2026-06-16 | Planned sample local credentials env flag coverage. | Codex |
| 2026-06-16 | Added Windows spawn option coverage. | Codex |
| 2026-06-16 | Planned Windows spawn option coverage. | Codex |
| 2026-06-16 | Added local sample dev launcher tests. | Codex |
| 2026-06-16 | Created test plan for local sample dev launcher. | Codex |
