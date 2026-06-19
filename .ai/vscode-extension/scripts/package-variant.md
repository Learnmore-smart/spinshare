# package-variant.mjs

> Last updated: 2026-06-19 | Protection: STANDARD

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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Planned Marketplace auto-update readiness guard and production publish path. | Codex |
| 2026-06-16 | Implemented prod/local package variant script and Windows spawn fix. | Codex |
| 2026-06-16 | Planned Windows `.cmd` spawn fix after package:all failure. | Codex |
| 2026-06-16 | Created plan for prod/local VSIX packaging script. | Codex |
