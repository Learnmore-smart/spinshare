# package.json

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Root workspace manifest and command entrypoint for the SpinShare monorepo.

## What It Does

- Declares the workspace name, package manager, Node engine, and root dev dependencies.
- Provides root commands for build, dev, test, e2e, lint, Firestore emulator startup, Firestore index deployment, production env verification, and local external-runtime preflight checks.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `build` | script | Builds all workspace packages in dependency order. |
| `test` | script | Runs package unit/property tests. |
| `test:e2e` | script | Runs the web e2e suite. |
| `lint` | script | Runs package TypeScript checks. |
| `emulators` | script | Starts the Firestore emulator when Firebase CLI is installed. |
| `deploy:indexes` | script | Deploys the Firestore index manifest through a repo-local wrapper that reads `FIREBASE_PROJECT_ID`. |
| `verify:prod-env` | script | Runs strict read-only checks for production env/provider readiness. |
| `verify:local-runtime` | script | Runs local external-runtime preflight checks for real Claude Code, Stripe CLI, Firebase emulator, and namespace-safe local env testing. |

## Dependencies

- **Internal:** workspace packages `@spinshare/core`, `@spinshare/web`, `@spinshare/cli`, `@spinshare/vscode-extension`.
- **External:** `corepack`, pnpm 9.12.0, Turborepo, TypeScript, Firebase CLI through `npx --yes firebase-tools`.

## Important Notes / NEVER Change

- This machine does not have global `pnpm` on PATH.
- Root scripts must be runnable through `corepack pnpm@9.12.0 <script>`.
- Keep package build order so `@spinshare/core` is built before consumers.
- Root `test` and `lint` must rebuild `@spinshare/core` before running consumer
  packages, because consumers resolve `@spinshare/core` through its package
  export in `dist`.
- Firebase CLI commands should not require a global `firebase` binary.
- Production verification must not print secrets or mutate live provider data.

## Bug Fix 2026-06-15 Stale Core Dist In Consumer Tests

Bug: web/CLI/extension imports of `@spinshare/core` resolve through
`packages/core/dist`. If a core schema changes but `dist` is stale, consumer
tests can run against old contracts and return misleading results.

Fix: root `test` and `lint` now run `corepack pnpm@9.12.0 --filter
@spinshare/core build` after core's own checks and before running consumer
packages.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Root `build`/`test`/`lint` via Turbo fail with `Unable to find package manager binary` when invoked through Corepack. | Turbo attempts to locate a package-manager binary that is not globally installed on this Windows machine. | Replace root Turbo scripts with explicit `corepack pnpm@9.12.0 --filter ...` package-level commands. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Rebuild core before consumer test/lint scripts to avoid stale dist. | Codex |
| 2026-06-13 | Created documentation for root script fix. | Codex |
| 2026-06-14 | Planned Firebase CLI scripts through `npx --yes firebase-tools` for emulator and index deploy portability. | Codex |
| 2026-06-14 | Planned `verify:prod-env` root script for repeatable live-provider readiness checks. | Codex |
| 2026-06-14 | Planned repo-local Firestore index deploy wrapper to avoid PowerShell/pnpm argument forwarding issues. | Codex |
| 2026-06-15 | Planned `verify:local-runtime` root script for real-machine external verification readiness. | Codex |
| 2026-06-15 | Implemented `verify:local-runtime`; current machine reports missing Stripe CLI and Java 8 blocking Firestore emulator. | Codex |
