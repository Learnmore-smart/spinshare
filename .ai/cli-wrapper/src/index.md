# index.ts

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
CLI executable entrypoint for `@spinshare/cli`.

## What It Does

- Parses top-level CLI arguments.
- Routes `spinshare login` to the device authorization flow.
- Routes `spinshare setup claude-code` to the Claude Code hooks/statusLine
  installer.
- Routes `spinshare <command> [args...]` to the wrapper that renders ads during spinner wait states.
- Executes `main()` only when the module is run directly as the CLI binary.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `parseArgs` | function | Pure argument parser for help/login/wrap commands. |
| `main` | async function | Runs the selected command and returns an exit code. |
| `isDirectExecution` | function | Detects whether the module is being run as the CLI entrypoint. |

## Planned Change 2026-06-15

Add `spinshare setup claude-code` so npm users can explicitly install the same
Claude Code hooks/statusLine adapter used by the VS Code extension. Also run the
same setup best-effort after `spinshare login` succeeds.

## Implemented Change 2026-06-15

`parseArgs()` now routes `spinshare setup claude-code`.

`spinshare login` now mirrors the stored token into the file credential location
that generated Claude hook scripts can read, then installs the Claude Code
adapter best-effort.

`spinshare setup claude-code` explicitly mirrors any available token and installs
the adapter, printing a login reminder if no token is available.

## Planned Change 2026-06-15 Adapter Removal

Route `spinshare setup claude-code --remove` to a safe Claude Code adapter
removal path. This should remove SpinShare hooks/statusLine from Claude Code
settings without touching unrelated user settings.

## Implemented Change 2026-06-15 Adapter Removal

`parseArgs()` now routes `spinshare setup claude-code --remove`, and `main()`
executes the Claude Code adapter removal path.

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `argv` | `string[]` | Yes | CLI args after the node/script executable. |

## Dependencies

- **Internal:** `./wrap.js` - command wrapper and impression reporting.
- **Internal:** `./login.js` - device login flow.
- **Internal:** `./api-client.js` - HTTP API client.
- **Internal:** `./credential-store.js` - persisted token storage.
- **External:** `node:url` and `node:path` - robust direct-execution path comparison.

## Important Notes / NEVER Change

- Direct-execution detection must work on Windows paths, URL-encoded paths, and paths containing non-ASCII characters.
- Importing this module in tests must not run the CLI.
- When run as the actual CLI binary, the process must call `process.exit(code)`
  after `main()` resolves. Windows `node-pty` can leave native handles alive even
  after `onExit`, so setting only `process.exitCode` is not enough for wrapped
  interactive commands.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-17 | Local CLI smoke showed and tracked the sample ad, but the CLI process timed out instead of exiting. | `node-pty` on Windows can keep the Node event loop alive after the child exits; the CLI direct-execution block only set `process.exitCode`. | Planned: route direct execution through a testable helper that calls `process.exit(code)` on success and `process.exit(1)` on failure. |
| 2026-06-14 | Built CLI exited without running on Windows/non-ASCII workspace paths. | Guard compared `import.meta.url` to raw `file://${process.argv[1]}`, which does not normalize Windows paths or URL encoding. | Compare `fileURLToPath(import.meta.url)` with `path.resolve(process.argv[1])`. |

## Implemented Change 2026-06-17: Direct Binary Exit

Added `runDirectExecution(argv, run, exitProcess, writeError)` so the direct
binary path is testable. When the CLI is run directly it now calls
`process.exit(code)` after `main()` resolves, and calls `process.exit(1)` after
writing a safe `spinshare:` error if `main()` rejects. Importing the module in
tests still does not execute the CLI.

## Verification 2026-06-17

- RED: `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/index.test.ts`
  failed because `runDirectExecution` did not exist.
- GREEN: focused `index.test.ts` + `wrap.test.ts` passed with 27 tests.
- Full CLI tests passed with 12 files / 100 tests.
- CLI typecheck passed with `corepack pnpm@9.12.0 --filter @spinshare/cli lint`.
- Real runtime smoke passed:
  `corepack pnpm@9.12.0 smoke:local-cli` built the CLI and returned
  `cli={"exitCode":0,"renderedLocalAd":true}`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented CLI hook credential mirroring with baseUrl metadata. | Codex |
| 2026-06-16 | Planned CLI hook credential mirroring with baseUrl metadata. | Codex |
| 2026-06-15 | Implemented CLI Claude Code adapter removal command. | Codex |
| 2026-06-15 | Implemented CLI Claude Code setup command and login auto-setup. | Codex |
| 2026-06-15 | Planned CLI Claude Code adapter removal command. | Codex |
| 2026-06-15 | Planned CLI Claude Code setup command and login auto-setup. | Codex |
| 2026-06-14 | Created documentation and planned direct-execution guard fix. | Codex |
