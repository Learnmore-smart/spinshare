# index.ts

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
CLI executable entrypoint for `@spinshare/cli`.

## What It Does

- Parses top-level CLI arguments.
- Routes `spinshare login` to the device authorization flow.
- Routes `spinshare <command> [args...]` to the wrapper that renders ads during spinner wait states.
- Executes `main()` only when the module is run directly as the CLI binary.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `parseArgs` | function | Pure argument parser for help/login/wrap commands. |
| `main` | async function | Runs the selected command and returns an exit code. |
| `isDirectExecution` | function | Detects whether the module is being run as the CLI entrypoint. |

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

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-14 | Built CLI exited without running on Windows/non-ASCII workspace paths. | Guard compared `import.meta.url` to raw `file://${process.argv[1]}`, which does not normalize Windows paths or URL encoding. | Compare `fileURLToPath(import.meta.url)` with `path.resolve(process.argv[1])`. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created documentation and planned direct-execution guard fix. | Codex |
