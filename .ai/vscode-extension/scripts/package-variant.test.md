# package-variant.test.mjs

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Tests the prod/local VSIX package variant helpers.

## Planned Coverage

- The local variant defaults `spinshare.baseUrl` to `http://localhost:3000` and
  labels the display name as local.
- The prod variant defaults `spinshare.baseUrl` to `https://www.spinshare.dev`.
- Output filenames are deterministic per flavor and version.
- Windows command wrappers are spawned through a shell so `corepack.cmd` can run.
- Marketplace auto-update readiness validates the stable extension id,
  SemVer-compatible version, and publish command package path.
- Prod/local variants preserve the same extension id until command ids and
  adapter ownership are deliberately namespaced.

## Implemented Coverage

The script helper tests cover local/prod manifest defaults, deterministic VSIX
names, and Windows-vs-non-Windows spawn shell options.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Planned tests for Marketplace auto-update readiness and prod publish arguments. | Codex |
| 2026-06-16 | Added package variant helper tests. | Codex |
| 2026-06-16 | Planned Windows spawn option coverage for package variant script. | Codex |
| 2026-06-16 | Created test plan for package variant helpers. | Codex |
