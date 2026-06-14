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

## Planned Changes (2026-06-14)

- Rename `name` from `@spinshare/vscode-extension` to `spinshare` for vsce compatibility.
- Move `@spinshare/core` to `devDependencies`.
- Add `.vscodeignore` for lean VSIX output.
- Add `media/icon.png`, README (en/zh-cn/fr-fr), `icon` + `repository` fields.
- Auto sign-in prompt on activation via `extension.ts`.
