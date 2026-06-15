# tsup.config.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Build configuration for the SpinShare CLI wrapper bundle.

## What It Does

- Builds `src/index.ts` as a Node ESM binary.
- Keeps sourcemaps for debugging.
- Marks native runtime modules external so they are loaded from packaged
  `node_modules` instead of bundled into a single JS file.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `defineConfig(...)` | Build config | tsup configuration consumed by `pnpm --filter @spinshare/cli build`. |

## Dependencies

- External: `tsup`.

## Important Notes / NEVER Change

- Native dependencies such as PTY libraries must not be bundled into the JS
  output; package/copy them next to the built CLI.
- The CLI must remain an ESM Node binary.

## Planned Change (2026-06-15)

Mark `@homebridge/node-pty-prebuilt-multiarch` external so the wrapper can load
its native module at runtime from the VSIX-packaged `node_modules` tree.

## Implemented Change (2026-06-15)

`external` now includes `@homebridge/node-pty-prebuilt-multiarch` alongside
`keytar`.

## Verification (2026-06-15)

- CLI build passed and emitted `dist/index.js`.
- VSIX package build passed and included the PTY runtime under
  `extension/cli-wrapper/node_modules`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Externalized PTY runtime dependency in tsup config. | Codex |
| 2026-06-15 | Created doc before externalizing PTY runtime dependency. | Codex |
