# vscode-extension/package.json

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

VS Code extension manifest and build scripts for local `.vsix` packaging and Marketplace publish.

## What It Does

- Defines extension metadata (`displayName`, `publisher`, commands, configuration).
- `name` must be `spinshare` (unscoped); `@vscode/vsce` rejects scoped names like `@spinshare/vscode-extension`.
- Workspace scripts filter by path `./vscode-extension` instead of the old scoped package name.
- Declares terminal auto-wrap settings and commands for integrated terminal agent shims.

## Public API

| Field | Value | Notes |
|-------|-------|-------|
| `name` | `spinshare` | Produces `spinshare-0.1.0.vsix` via `vsce package` |
| `publisher` | `spinshare` | Marketplace publisher id |
| `main` | `./out/extension.js` | Compiled output from `pnpm build` |
| `spinshare.terminalAutoWrap` | `true` | Enables automatic terminal PATH shims |
| `spinshare.terminalAgents` | `["claude"]` | Commands intercepted in new integrated terminals |

## Dependencies

- `@spinshare/core` is a devDependency only for type imports erased at compile time.

## Important Notes / NEVER Change

- Run `pnpm build` in `vscode-extension` before `vsce package`.
- Local install: Extensions panel, `...`, Install from VSIX.
- The terminal auto-wrap command list must stay explicit; do not attempt to intercept every executable in `PATH`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Add terminal auto-wrap settings and rebuild command so configured agents like `claude` are intercepted in new integrated terminals. | Codex |
| 2026-06-14 | Workspace `.vscode/settings.json` `spinshare.baseUrl` changed to `https://spinshare.dev` from a localhost dev override. | Codex |

## Notes

- Extension default `spinshare.baseUrl` in `package.json` is `https://www.spinshare.dev`; workspace settings override when running Extension Development Host.

## Planned Changes

- Add `spinshare.terminalAutoWrap` to enable or disable automatic terminal PATH shims.
- Add `spinshare.terminalAgents` with default `["claude"]`.
- Add `spinshare.rebuildTerminalShims` command for manually regenerating the shim files.

## Implemented Change

- Added `spinshare.rebuildTerminalShims` command contribution.
- Added default-on `spinshare.terminalAutoWrap`.
- Added `spinshare.terminalAgents` with default `["claude"]` and a safe command-name pattern.

## Verification

- Extension TypeScript check passed.
- Extension build passed.
