# package.json

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Package manifest for the SpinShare CLI wrapper.

## What It Does

- Declares the wrapper as an ESM Node binary.
- Defines build, test, and lint scripts.
- Lists runtime dependencies needed by the packaged CLI.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `bin.spinshare` | CLI entry | Runs `dist/index.js`. |
| `scripts.build` | Script | Builds the bundled CLI with tsup. |

## Dependencies

- Internal: `@spinshare/core`.
- External: PTY support via `@homebridge/node-pty-prebuilt-multiarch`.
- External: optional native keychain support via `keytar`.

## Important Notes / NEVER Change

- The CLI bundle must remain runnable as a Node ESM binary.
- Native/runtime dependencies needed after VSIX installation must either be bundled or copied into the extension package.

## Planned Change (2026-06-15)

Add a PTY runtime dependency for interactive CLI wrapping so Claude/Gemini/Codex-style tools can keep TTY behavior while SpinShare observes output.

## Planned Change (2026-06-15 npm Publishability)

Make the CLI package publishable/installable outside the monorepo:

- remove the `private: true` flag;
- keep runtime dependencies free of `workspace:*` versions;
- move `@spinshare/core` to devDependencies because CLI source uses it only for
  erased TypeScript types and the built `dist/index.js` has no runtime import.

## Implemented Change (2026-06-15 npm Publishability)

Removed `private: true`, normalized `bin.spinshare` to `dist/index.js`, and
moved `@spinshare/core` out of runtime dependencies. Added manifest tests so
runtime dependencies cannot publish `workspace:*`.

## Implemented Change (2026-06-15)

`@homebridge/node-pty-prebuilt-multiarch` is now a runtime dependency. Packaging
must copy it alongside the built CLI because it contains native files that
cannot be bundled by tsup.

## Verification (2026-06-15)

- CLI type check and full tests passed after adding the dependency.
- VSIX package build passed and included the copied PTY runtime.
- Extension-local `require("@homebridge/node-pty-prebuilt-multiarch")` returned
  a `spawn` function.
- `npm publish --dry-run` passed for `@spinshare/cli@0.1.0`; it only warns that
  real publishing requires npm login.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented npm publishability manifest fix. | Codex |
| 2026-06-15 | Added PTY runtime dependency documentation. | Codex |
| 2026-06-15 | Planned npm publishability manifest fix. | Codex |
| 2026-06-15 | Created doc before adding PTY support dependency. | Codex |
