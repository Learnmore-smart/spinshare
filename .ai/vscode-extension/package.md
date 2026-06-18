# vscode-extension/package.json

> Last updated: 2026-06-15 | Protection: STANDARD

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
| `package:prod` | script | Builds a production VSIX defaulting to `https://www.spinshare.dev`. |
| `package:local` | script | Builds a localhost VSIX defaulting to `http://localhost:3000`. |
| `package:all` | script | Builds both production and localhost VSIX artifacts. |

## Dependencies

- `@spinshare/core` is a devDependency only for type imports erased at compile time.

## Important Notes / NEVER Change

- Run `pnpm build` in `vscode-extension` before `vsce package`.
- Local install: Extensions panel, `...`, Install from VSIX.
- The terminal auto-wrap command list must stay explicit; do not attempt to intercept every executable in `PATH`.
- A packaged extension must include `cli-wrapper/dist`, otherwise terminal shims can only work for developers who separately installed a global `spinshare` command.
- The packaged extension root must remain CommonJS-compatible for `out/extension.js`; put CLI ESM metadata under `cli-wrapper/package.json`, not the root manifest.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-15 | Installed extension emitted Node's module-type warning when the bundled CLI ran. | The nested CLI bundle lacked its own package manifest, while the root extension manifest cannot be marked as ESM without breaking extension activation. | Package a nested `cli-wrapper/package.json` with `"type": "module"`. |

## Planned Fix (2026-06-15)

Update package scripts so the CLI wrapper is built and copied into the extension before packaging. Keep extension `build` usable after the root build has already produced `cli-wrapper/dist`; make `package` build the CLI explicitly.

## Planned Change (2026-06-15 Claude Code Adapter)

Add a default-on `spinshare.claudeCodeAdapter` configuration flag so users can disable automatic Claude Code settings installation if needed.

## Implemented Change (2026-06-15 Claude Code Adapter)

Added default-on `spinshare.claudeCodeAdapter` configuration.

## Planned Change (2026-06-15 Claude Code Adapter Removal)

Add a contributed command for removing the Claude Code hooks/statusLine adapter.
The extension installs by default, so the command palette must expose a clear
undo path.

## Implemented Change (2026-06-15 Claude Code Adapter Removal)

Added `spinshare.removeClaudeCodeAdapter` to the contributed commands list.

## Planned Packaging Fix (2026-06-15)

The VSIX packaging script currently calls bare `vsce`, which fails on Windows when no global `vsce` command exists. Add the official local `@vscode/vsce` devDependency and invoke it via `corepack pnpm@9.12.0 exec vsce`.

## Implemented Packaging Fix

- Added `@vscode/vsce` as a local devDependency.
- Updated the `package` script to invoke `corepack pnpm@9.12.0 exec vsce package`.

## Verification

- `corepack pnpm@9.12.0 --filter ./vscode-extension package` passed.
- The generated VSIX includes `extension/cli-wrapper/dist/index.js`.
- 2026-06-17: Planned repackaging after earnings/environment fixes so both prod and local VSIX artifacts include the latest extension auth, Claude Code adapter, and bundled CLI credential behavior.
- 2026-06-17: Rebuilt `spinshare-prod-0.2.0.vsix` and `spinshare-local-0.2.0.vsix` after earnings/environment fixes, then refreshed the legacy `spinshare-0.2.0.vsix` filename from the rebuilt prod artifact so no stale default-named package remains. Initial `package:all` built prod but hit a transient Windows open error during post-package ZIP cleanup; rerunning `package-variant.mjs local` and `package-variant.mjs prod` completed successfully. Manifest inspection confirmed prod defaults to `https://www.spinshare.dev`, local defaults to `http://localhost:3000`, both generated Claude adapters enforce strict baseUrl token matching, and both bundled CLI builds include strict credential environment checks.
- 2026-06-15: Rebuilt `spinshare-0.2.0.vsix` after production base URL canonicalization; package output includes rebuilt `out/api-client.js`, `out/extension.js`, and bundled `cli-wrapper/dist/index.js`.
- 2026-06-15: Rebuilt `spinshare-0.2.0.vsix` after terminal passthrough and CLI ESM metadata fixes; package output includes `extension/cli-wrapper/package.json`.
- 2026-06-15: Rebuilt `spinshare-0.2.0.vsix` after Claude adapter removal and BOM-safe settings parsing; package inspection confirms `spinshare.removeClaudeCodeAdapter`, bundled `setup claude-code --remove`, and `parseClaudeSettings`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Rebuilt prod/local VSIX artifacts after earnings/environment fixes, refreshed the legacy prod filename, and verified manifest defaults plus bundled credential filtering. | Codex |
| 2026-06-17 | Planned prod/local VSIX rebuild after earnings/environment fixes. | Codex |
| 2026-06-16 | Implemented prod/local VSIX variant packaging. | Codex |
| 2026-06-16 | Planned prod/local VSIX variant packaging. | Codex |
| 2026-06-15 | Added `spinshare.removeClaudeCodeAdapter` command contribution. | Codex |
| 2026-06-15 | Planned `spinshare.removeClaudeCodeAdapter` command contribution. | Codex |
| 2026-06-15 | Added `spinshare.claudeCodeAdapter` setting. | Codex |
| 2026-06-15 | Planned `spinshare.claudeCodeAdapter` setting for automatic Claude Code adapter install. | Codex |
| 2026-06-15 | Rebuilt `spinshare-0.2.0.vsix` with terminal passthrough and nested CLI ESM metadata. | Codex |
| 2026-06-15 | Rebuilt `spinshare-0.2.0.vsix` with canonical production base URL handling. | Codex |
| 2026-06-15 | Verified VSIX packaging includes the bundled CLI wrapper. | Codex |
| 2026-06-15 | Added local `@vscode/vsce` packager and pnpm exec package command. | Codex |
| 2026-06-15 | Planned local VSCE dependency and package-script fix. | Codex |
| 2026-06-15 | Documented CLI bundle packaging fix. | Codex |
| 2026-06-14 | Add terminal auto-wrap settings and rebuild command so configured agents like `claude` are intercepted in new integrated terminals. | Codex |
| 2026-06-14 | Workspace `.vscode/settings.json` `spinshare.baseUrl` changed to `https://spinshare.dev` from a localhost dev override. | Codex |

## Notes

- Extension default `spinshare.baseUrl` in `package.json` is `https://www.spinshare.dev`; workspace settings override when running Extension Development Host.

## Implemented Change 2026-06-16 Prod/Local VSIX Variants

Add a packaging script that can temporarily rewrite the manifest default
`spinshare.baseUrl` while packaging, then restore the source manifest. The prod
artifact should default to `https://www.spinshare.dev`; the local artifact
should default to `http://localhost:3000` and use a local display name so the
installed extension is visibly a dev build.

The variants should keep one extension id for now. That means installing local
replaces prod instead of running both simultaneously, which avoids duplicate
command ids, terminal shims, and Claude Code adapter ownership conflicts.

`package` and `package:prod` build `spinshare-prod-0.2.0.vsix`. `package:local`
builds `spinshare-local-0.2.0.vsix`. `package:all` builds both after one CLI and
extension build.

Auth tokens are now scoped by normalized `spinshare.baseUrl`, so the local VSIX
does not reuse a production token. Production still migrates the legacy token
key to avoid signing out existing users.

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
