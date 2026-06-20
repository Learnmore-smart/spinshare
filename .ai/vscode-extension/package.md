# vscode-extension/package.json

> Last updated: 2026-06-19 | Protection: STANDARD

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
| `spinshare.terminalAgents` | `["claude", "agy", "antigravity"]` | Commands intercepted in new integrated terminals |
| `package:prod` | script | Builds a production VSIX defaulting to `https://www.spinshare.dev`. |
| `package:local` | script | Builds a localhost VSIX defaulting to `http://localhost:3000`. |
| `package:all` | script | Builds both production and localhost VSIX artifacts. |

## Dependencies

- `@spinshare/core` is a devDependency only for type imports erased at compile time.

## Bug Fix Plan 2026-06-20 Safe ZIP dependency usage

The Marketplace corruption fix removes every `adm-zip` write operation. Keep
the existing devDependency only for read-only validation of the completed VSIX:
required OPC entries, exact manifest/README path matching, and prohibited debug
payload checks. This avoids a package/lockfile churn while turning the library
from a mutator into a packaging guard.

## Important Notes / NEVER Change

- Run `pnpm build` in `vscode-extension` before `vsce package`.
- Local install: Extensions panel, `...`, Install from VSIX.
- The terminal auto-wrap command list must stay explicit; do not attempt to intercept every executable in `PATH`.
- A packaged extension must include `cli-wrapper/dist`, otherwise terminal shims can only work for developers who separately installed a global `spinshare` command.
- The packaged extension root must remain CommonJS-compatible for `out/extension.js`; put CLI ESM metadata under `cli-wrapper/package.json`, not the root manifest.

## Bug Fix Plan 2026-06-19 Antigravity CLI default setting

**Bug:** The extension manifest default for `spinshare.terminalAgents` is still
Claude-only. VS Code-compatible hosts read this manifest default before
`terminal-auto-wrap.ts` fallback defaults matter, so Antigravity users get no
`agy` shim unless they manually configure the setting.

**Fix Strategy:** Update the contributed configuration default to include
`agy` and `antigravity`, matching the TypeScript default list. Keep the setting
explicit and sanitized; do not broaden it to intercept every command.

**Test Plan:** Run focused terminal auto-wrap tests plus extension typecheck so
the default-setting and generated-shim behavior stay aligned.

## Bug Fix Implemented 2026-06-19 Antigravity CLI default setting

The contributed `spinshare.terminalAgents` default now includes `claude`, `agy`,
and `antigravity`. This matches `DEFAULT_TERMINAL_AGENTS`, so a fresh install in
VS Code-compatible hosts generates Antigravity shims without manual settings.

Verification:
- RED: focused terminal auto-wrap test failed on the old manifest default
  `["claude"]`.
- GREEN: `corepack pnpm@9.12.0 test -- src/terminal-auto-wrap.test.ts` from
  `vscode-extension` passed 11 tests.

## Bug Fix Plan 2026-06-19 Stale Antigravity VSIX artifacts

**Bug:** Reinstalling the extension still shows no Antigravity ads because the
tracked VSIX artifacts were not rebuilt after adding `agy` / `antigravity`.
Inspection confirmed `spinshare-prod-0.2.0.vsix` and
`spinshare-local-0.2.0.vsix` still contained manifest defaults of `["claude"]`
and bundled `terminal-auto-wrap.js` with `DEFAULT_TERMINAL_AGENTS = ["claude"]`.

**Fix Strategy:** Rebuild the CLI and extension package variants, then refresh
the legacy `spinshare-0.2.0.vsix` filename from the rebuilt production package
so any install file the user picks contains the Antigravity changes.

**Test Plan:** Inspect all three VSIX artifacts after packaging and confirm:
`spinshare.terminalAgents` contains `["claude","agy","antigravity"]`, bundled
`extension/out/terminal-auto-wrap.js` contains `agy` and `antigravity`, and
bundled `extension/cli-wrapper/dist/index.js` contains the Antigravity-prefixed
wait-line classifier.

## Bug Fix Implemented 2026-06-19 Stale Antigravity VSIX artifacts

Rebuilt `spinshare-prod-0.2.0.vsix` and `spinshare-local-0.2.0.vsix` with
`corepack pnpm@9.12.0 package:all`, then refreshed the legacy
`spinshare-0.2.0.vsix` from the rebuilt production artifact.

Verification:
- Before rebuild, VSIX inspection showed package defaults of `["claude"]` and
  bundled `DEFAULT_TERMINAL_AGENTS = ["claude"]`.
- After rebuild, all three VSIX artifacts report
  `spinshare.terminalAgents = claude,agy,antigravity`.
- After rebuild, packaged `extension/out/terminal-auto-wrap.js` contains both
  `agy` and `antigravity`.
- After rebuild, packaged `extension/cli-wrapper/dist/index.js` contains the
  updated `STATUS_PREFIX_PATTERN` with `\u2800-\u28ff`.

## Bug Fix Plan 2026-06-19 Same-version reinstall keeps stale install

**Bug:** The live installed extension at
`C:\Users\noahz\.vscode\extensions\spinshare.spinshare-0.2.0` still contains
the old manifest default `["claude"]`, even though the rebuilt source artifacts
contain Antigravity defaults. Same-version VSIX reinstall makes it too easy to
keep testing a stale versioned install folder.

**Fix Strategy:** Bump the extension manifest version to `0.2.1` and rebuild
prod and local VSIX variants. This forces installation into a new versioned
folder for the Antigravity compatibility build.

**Test Plan:** Re-run terminal auto-wrap tests, extension typecheck/build, build
the new VSIX variants, and inspect the packaged manifests plus bundled launcher
for `claude,agy,antigravity`.

## Bug Fix Implemented 2026-06-19 Same-version reinstall keeps stale install

Bumped the extension manifest to `0.2.1` and rebuilt prod/local package
variants. This avoids the stale live `spinshare.spinshare-0.2.0` install folder
that still had
`spinshare.terminalAgents = ["claude"]`.

Verification:
- `corepack pnpm@9.12.0 test -- src/terminal-auto-wrap.test.ts` passed 11 tests.
- `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/renderer.test.ts src/wrap.test.ts`
  passed 35 tests.
- `corepack pnpm@9.12.0 lint` from `vscode-extension` passed.
- `corepack pnpm@9.12.0 package:all` produced
  `spinshare-prod-0.2.1.vsix` and `spinshare-local-0.2.1.vsix`.
- Inspection of `spinshare-prod-0.2.1.vsix` and
  `spinshare-local-0.2.1.vsix` confirmed version `0.2.1`, agents
  `claude,agy,antigravity`, Antigravity shims in bundled
  `terminal-auto-wrap.js`, and `\u2800-\u28ff` status-prefix support in bundled
  `cli-wrapper/dist/index.js`.

## Artifact Cleanup 2026-06-19

Cleaned the VSIX output folder down to the two supported install artifacts:

- `spinshare-prod-0.2.1.vsix`
- `spinshare-local-0.2.1.vsix`

Removed old `0.2.0` packages and the extra unflavored `spinshare-0.2.1.vsix`
alias so users do not accidentally install a stale or ambiguous build.

## Bug Fix Plan 2026-06-19 Antigravity below-status package

**Bug:** After Antigravity wrapping started working, ads flickered between
consecutive Antigravity status variants and appeared on the prompt/status line.

**Fix Strategy:** Package the CLI renderer/wrapper below-status rendering fix as
extension version `0.2.2`, keeping only one prod and one local VSIX artifact.

**Test Plan:** Run focused CLI renderer/wrapper tests, extension lint/build,
package prod/local VSIXs, remove old `0.2.1` VSIXs, and inspect the two
remaining packages for version `0.2.2` and the Antigravity agent defaults.

## Bug Fix Implemented 2026-06-19 Antigravity below-status package

Bumped the extension manifest to `0.2.2`, packaged the renderer/wrapper
below-status fix, and cleaned the VSIX folder back down to:

- `spinshare-prod-0.2.2.vsix`
- `spinshare-local-0.2.2.vsix`

Verification:
- `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/renderer.test.ts src/wrap.test.ts`
  passed 37 tests.
- `corepack pnpm@9.12.0 --filter @spinshare/cli lint` passed.
- `corepack pnpm@9.12.0 lint` from `vscode-extension` passed.
- `corepack pnpm@9.12.0 package:all` produced prod/local `0.2.2` packages.
- Package inspection confirmed both remaining VSIXs are version `0.2.2`, keep
  agents `claude,agy,antigravity`, and their bundled CLI contains `working` plus
  below-status cursor rendering support.

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
| 2026-06-20 | Restricted `adm-zip` to read-only VSIX verification; no archive writes are permitted. | Codex |
| 2026-06-19 | Implemented `0.2.2` prod/local packages for Antigravity below-status rendering. | Codex |
| 2026-06-19 | Planned `0.2.2` prod/local packages for Antigravity below-status rendering. | Codex |
| 2026-06-19 | Cleaned VSIX artifacts down to one prod and one local `0.2.1` package. | Codex |
| 2026-06-19 | Implemented `0.2.1` VSIX rebuild to avoid stale same-version Antigravity installs. | Codex |
| 2026-06-19 | Planned `0.2.1` VSIX rebuild to avoid stale same-version Antigravity installs. | Codex |
| 2026-06-19 | Planned production publish path and manifest stability guard for later Marketplace auto-update support. | Codex |
| 2026-06-19 | Rebuilt prod/local/legacy VSIX artifacts after Antigravity compatibility fix and verified packaged contents. | Codex |
| 2026-06-19 | Planned rebuild of stale VSIX artifacts after Antigravity compatibility fix. | Codex |
| 2026-06-19 | Implemented Antigravity CLI default terminal agent setting. | Codex |
| 2026-06-19 | Planned Antigravity CLI default terminal agent setting. | Codex |
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

## Planned Change 2026-06-19 Marketplace auto-update support

VS Code extension auto-update is provided by the Marketplace for enabled
extensions installed from Marketplace; VSIX installs disable auto-update by
default. Keep the manifest stable for later deployment and expose a production
publish script that uses the prod package artifact:

- Preserve `publisher: spinshare`, `name: spinshare`, and SemVer `version` as
  the update identity and version signal.
- Add `publish:prod` so deployment publishes the production VSIX through `vsce`
  instead of sharing the VSIX as the final user install path.
- Keep `package:local` as a development artifact; it remains a VSIX install and
  should not be represented as auto-updating.

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

## Implemented Change (2026-06-19 Self-Update)

- Added `spinshare.checkForUpdate` command ("SpinShare: Check for Updates").
- Added default-on `spinshare.autoUpdate` setting that lets the extension poll
  its configured base URL for a newer published VSIX and install it in place
  (the editor does not auto-update sideloaded extensions). The local flavor
  defaults this to `false` via `package-variant.mjs`.
- Added `publish:prod` script ([publish-prod.md](scripts/publish-prod.md)) that
  packages prod, copies the VSIX into `web/public`, and bumps the advertised
  version so the served artifact and `/api/extension/version` cannot drift.

## Verification

- Extension TypeScript check passed.
- Extension build passed.
