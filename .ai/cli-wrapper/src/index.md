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

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-14 | Built CLI exited without running on Windows/non-ASCII workspace paths. | Guard compared `import.meta.url` to raw `file://${process.argv[1]}`, which does not normalize Windows paths or URL encoding. | Compare `fileURLToPath(import.meta.url)` with `path.resolve(process.argv[1])`. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented CLI Claude Code adapter removal command. | Codex |
| 2026-06-15 | Implemented CLI Claude Code setup command and login auto-setup. | Codex |
| 2026-06-15 | Planned CLI Claude Code adapter removal command. | Codex |
| 2026-06-15 | Planned CLI Claude Code setup command and login auto-setup. | Codex |
| 2026-06-14 | Created documentation and planned direct-execution guard fix. | Codex |
