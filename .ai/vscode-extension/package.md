# vscode-extension/package.json

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

VS Code extension manifest and build scripts for local `.vsix` packaging and Marketplace publish.

## What It Does

- Defines extension metadata (`displayName`, `publisher`, commands, configuration).
- `name` must be `spinshare` (unscoped) — `@vscode/vsce` rejects scoped names like `@spinshare/vscode-extension`.
- Workspace scripts filter by path `./vscode-extension` instead of the old scoped package name.

## Public API

| Field | Value | Notes |
|-------|-------|-------|
| `name` | `spinshare` | Produces `spinshare-0.1.0.vsix` via `vsce package` |
| `publisher` | `spinshare` | Marketplace publisher id |
| `main` | `./out/extension.js` | Compiled output from `pnpm build` |

## Dependencies

- `@spinshare/core` — **devDependency** only (type-only imports; erased at compile time).

## Important Notes / NEVER Change

- Run `pnpm build` in `vscode-extension` before `vsce package`.
- Local install: Extensions panel → `...` → Install from VSIX.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Workspace `.vscode/settings.json` `spinshare.baseUrl` → `https://spinshare.dev` (was localhost override for dev) | Codex |

## Notes

- Extension default `spinshare.baseUrl` in `package.json` is `https://www.spinshare.dev`; workspace settings override when running Extension Development Host.
