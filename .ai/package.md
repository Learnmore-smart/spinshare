# package.json

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Root workspace manifest and command entrypoint for the SpinShare monorepo.

## What It Does

- Declares the workspace name, package manager, Node engine, and root dev dependencies.
- Provides root commands for build, dev, test, e2e, lint, Firestore emulator startup, and Firestore index deployment.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `build` | script | Builds all workspace packages in dependency order. |
| `test` | script | Runs package unit/property tests. |
| `test:e2e` | script | Runs the web e2e suite. |
| `lint` | script | Runs package TypeScript checks. |
| `emulators` | script | Starts the Firestore emulator when Firebase CLI is installed. |
| `deploy:indexes` | script | Deploys the Firestore index manifest through Firebase CLI. |

## Dependencies

- **Internal:** workspace packages `@spinshare/core`, `@spinshare/web`, `@spinshare/cli`, `@spinshare/vscode-extension`.
- **External:** `corepack`, pnpm 9.12.0, Turborepo, TypeScript, Firebase CLI through `npx --yes firebase-tools`.

## Important Notes / NEVER Change

- This machine does not have global `pnpm` on PATH.
- Root scripts must be runnable through `corepack pnpm@9.12.0 <script>`.
- Keep package build order so `@spinshare/core` is built before consumers.
- Firebase CLI commands should not require a global `firebase` binary.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Root `build`/`test`/`lint` via Turbo fail with `Unable to find package manager binary` when invoked through Corepack. | Turbo attempts to locate a package-manager binary that is not globally installed on this Windows machine. | Replace root Turbo scripts with explicit `corepack pnpm@9.12.0 --filter ...` package-level commands. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for root script fix. | Codex |
| 2026-06-14 | Planned Firebase CLI scripts through `npx --yes firebase-tools` for emulator and index deploy portability. | Codex |
