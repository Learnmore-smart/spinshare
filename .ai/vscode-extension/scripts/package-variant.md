# package-variant.mjs

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Packages the VS Code/Cursor/Trae extension as either a production or localhost
VSIX artifact.

## Implemented Change

Create a script that:

- reads `vscode-extension/package.json`;
- applies a `prod` or `local` manifest variant while packaging;
- restores the original manifest in a `finally` block;
- emits deterministic output names:
  `spinshare-prod-<version>.vsix` and `spinshare-local-<version>.vsix`;
- fixes README casing inside the created VSIX.

## Implemented Bug Fix 2026-06-16 Windows Corepack Spawn

The first real `package:all` run built the CLI and extension, then failed at
VSIX packaging with `spawnSync corepack.cmd EINVAL`. On Windows, spawning a
`.cmd` command from Node needs shell execution. Add a small helper for spawn
options and cover it in tests.

The script now uses `spawnOptionsForPlatform()`, which sets `shell: true` on
Windows and `shell: false` elsewhere.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `applyFlavorToManifest` | Function | Returns a manifest copy with prod/local defaults applied. |
| `vsixOutputName` | Function | Computes the deterministic VSIX filename for a flavor. |
| `packageVariant` | Function | Runs the package flow for one flavor. |
| `node scripts/package-variant.mjs <flavor>` | CLI | Packages `prod` or `local`. |

## Planned Change 2026-06-19 Marketplace auto-update readiness

VS Code handles automatic updates for Marketplace-installed extensions, while
local VSIX installs have auto-update disabled by default. Add safeguards so the
production artifact is ready for Marketplace deployment later:

- Validate the manifest has a stable Marketplace identity (`publisher.name`) and
  SemVer `version`.
- Keep prod/local package variants on the same extension identity for now so a
  later Marketplace install targets the same extension id.
- Add a production publish path that packages the prod VSIX, then publishes that
  exact artifact through `vsce publish --packagePath`.
- Keep restoring the source manifest after temporary flavor rewrites.

## Important Notes / NEVER Change

- Always restore the original package manifest after packaging.
- Keep the local artifact isolated by defaulting only `spinshare.baseUrl`; do
  not re-enable anonymous ad serving.
- Do not make local and prod simultaneously installed until command ids and
  Claude adapter ownership are namespaced.

## Bug Fix Plan 2026-06-20 Marketplace malformed/corrupted rejection

**Bug:** Marketplace rejects the generated VSIX as malformed/corrupted.

**Root Cause:** `vsce` emits an internally consistent OPC archive whose
manifest references `extension/readme.md`. `fixVsixReadmeCasing()` then opens
that archive with `adm-zip`, renames the entry to `extension/README.md` without
updating the manifest asset path, and rewrites the entire archive. The final
artifact therefore differs from the valid `vsce` output and contains a
case-sensitive manifest/entry mismatch.

**Fix Strategy:** Treat `vsce` output as immutable. Remove the `adm-zip`
post-processing call and its helper. Keep the lowercase primary README entry
because that is the path recorded by `vsce` in `extension.vsixmanifest`. Run a
read-only validator after packaging; it may inspect but must never rewrite the
artifact.

**Regression Risks:** A future change could reintroduce post-processing or
produce a manifest path that does not exist in the archive.

**Test Plan:** Add a focused package-flow regression test that proves the
packager performs no post-package mutation, then inspect a freshly generated
VSIX to verify the manifest README asset resolves to an exact archive entry.

## Bug Fix Plan 2026-06-20 Vitest collection failure

**Bug:** `package-variant.test.mjs` fails during collection with
`SyntaxError: Invalid or unexpected token` before any test runs.

**Root Cause:** Vite's SSR transform emits module imports before the original
`#!/usr/bin/env node` line, leaving the shebang in the middle of JavaScript.

**Fix Strategy:** Remove the shebang. Every repository script invokes this file
explicitly with `node`, so direct executable invocation is not required.

**Test Plan:** Re-run the focused package variant test and confirm all tests are
collected, including the injected package/verify orchestration case.

## Implemented Fix 2026-06-20 Marketplace-safe packaging

- Removed every VSIX mutation and README rename from the package flow.
- The output of official `vsce package` is now treated as immutable.
- Added injectable command/verification hooks so orchestration and manifest
  restoration are covered without launching a real packager in unit tests.
- Runs `verifyVsixFile()` after `vsce` and restores the source manifest even if
  packaging or validation fails.
- Removed the unnecessary shebang so Vite/Vitest can collect the module.

Verification:
- Focused package/validator suite passed 10 tests.
- Full extension suite passed 94 tests; TypeScript check passed.
- Full `package:all` build completed for prod and local artifacts.
- Both artifacts declare and contain exact `extension/readme.md` entries.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Implemented immutable VSIX packaging, read-only validation, and testable orchestration. | Codex |
| 2026-06-20 | Documented the Vite shebang transform failure and removal plan. | Codex |
| 2026-06-20 | Documented the Marketplace corruption root cause and immutable-vsce-output fix plan. | Codex |
| 2026-06-19 | Flavor now also sets `spinshare.autoUpdate` default (prod `true`, local `false`) so dev builds never self-reinstall from localhost. | Claude |
| 2026-06-19 | Planned Marketplace auto-update readiness guard and production publish path. | Codex |
| 2026-06-16 | Implemented prod/local package variant script and Windows spawn fix. | Codex |
| 2026-06-16 | Planned Windows `.cmd` spawn fix after package:all failure. | Codex |
| 2026-06-16 | Created plan for prod/local VSIX packaging script. | Codex |
