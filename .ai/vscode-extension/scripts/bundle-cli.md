# bundle-cli.mjs

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Copies the built SpinShare CLI wrapper into the VS Code extension package so terminal shims can launch it after extension installation.

## What It Does

- Removes the extension-local `cli-wrapper/dist` bundle directory.
- Copies `../cli-wrapper/dist` into `vscode-extension/cli-wrapper/dist`.
- Writes a nested `vscode-extension/cli-wrapper/package.json` declaring the bundled CLI as ESM.
- Copies required native/runtime CLI dependencies into
  `vscode-extension/cli-wrapper/node_modules`.
- Fails clearly if the CLI has not been built first.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Script | Node CLI | Run from `vscode-extension` package scripts. |

## Dependencies

- Internal: `cli-wrapper/dist`.
- External: Node `fs/promises`, `path`, `url`.

## Important Notes / NEVER Change

- Do not copy source files, secrets, or unrelated workspace `node_modules`.
- The extension should package only the compiled CLI bundle needed by terminal shims.
- The nested `cli-wrapper/package.json` must declare `"type": "module"`; setting it on the extension root would break the CommonJS extension entrypoint.
- PTY native files must be copied with dereferenced symlinks from pnpm's layout.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-15 | Running the bundled CLI from an installed extension emitted Node's `MODULE_TYPELESS_PACKAGE_JSON` warning. | The VSIX included `cli-wrapper/dist/index.js` as ESM but did not include a nearest package manifest declaring `"type": "module"`. | Write a nested `cli-wrapper/package.json` during bundling. |

## Planned Change

Bundle the CLI into VSIX builds so installing the extension is enough for auto-wrapped integrated terminals.

## Planned Fix (2026-06-15)

Write `vscode-extension/cli-wrapper/package.json` with `private: true` and
`type: "module"` whenever the CLI bundle is copied.

## Implemented Fix (2026-06-15)

`bundle-cli.mjs` now writes a nested `cli-wrapper/package.json` with
`private: true` and `type: "module"` after copying the compiled CLI bundle.

## Planned Fix (2026-06-15)

Copy `@homebridge/node-pty-prebuilt-multiarch` into the extension-local
`cli-wrapper/node_modules` tree so the installed VSIX can run the PTY-backed
wrapper without relying on the user's workspace dependencies.

## Implemented Fix (2026-06-15)

`bundle-cli.mjs` now checks for the PTY package, clears the extension-local
`cli-wrapper/node_modules`, and copies the real package directory with
`realpath` plus `dereference: true`.

## Verification (2026-06-15)

- Red extension focused test failed because the script did not mention the PTY
  runtime.
- Green extension focused test passed with 9 tests.
- VSIX package build passed and listed the PTY runtime in the extension package.
- Extension-local runtime smoke check passed: requiring
  `@homebridge/node-pty-prebuilt-multiarch` returned a `spawn` function.

## Verification (2026-06-15)

- Red: focused terminal auto-wrap/package script test failed because the script did not reference the nested package manifest.
- Green: focused test passed after adding the manifest write.
- Package build passed and VSIX output listed `extension/cli-wrapper/package.json`.
- Direct smoke check `node vscode-extension/cli-wrapper/dist/index.js --help` printed usage without the Node module-type warning.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented PTY runtime copy for VSIX packaging. | Codex |
| 2026-06-15 | Planned PTY runtime copy for VSIX packaging. | Codex |
| 2026-06-15 | Implemented nested ESM package manifest for bundled CLI. | Codex |
| 2026-06-15 | Planned nested ESM package manifest for bundled CLI. | Codex |
| 2026-06-15 | Created doc for CLI bundling script. | Codex |
