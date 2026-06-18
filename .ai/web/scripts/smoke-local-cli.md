# smoke-local-cli.mjs

> Last updated: 2026-06-17 | Protection: STANDARD

## Purpose

Runs a real local smoke test for the npm CLI wrapper against the localhost
sample server.

## What It Does

- Starts the local sample web server.
- Signs in with the fixed local developer credentials.
- Approves a device flow and obtains a `Device_Auth_Token`.
- Runs the built CLI wrapper with `SPINSHARE_BASE_URL=http://127.0.0.1:3000`
  and `SPINSHARE_TOKEN=<token>`.
- Wraps `node cli-wrapper/fake-ai.js`, which emits spinner frames for several
  seconds.
- Verifies the CLI output contains the local sample ad text.
- Stops the spawned server process tree.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `isLocalCliAdOutput` | function | Checks whether captured CLI output contains the local sample ad text. |
| `cliSmokeCommand` | function | Builds the command used to run the built CLI against `fake-ai.js`. |
| `runLocalCliSmoke` | function | Full runtime smoke orchestration. |
| CLI | command | `node web/scripts/smoke-local-cli.mjs` |

## Dependencies

- Internal: `web/scripts/smoke-local-sample.mjs` for server/auth helpers.
- Internal: `cli-wrapper/dist/index.js` and `cli-wrapper/fake-ai.js`.
- External: Node built-in `child_process`, `path`, `url`.

## Important Notes / NEVER Change

- Do not require production credentials or production ads.
- Do not print the device token.
- The root script should build the CLI first so smoke runs against current code.
- Keep the assertion tied to the local sample ad text, not any production
  campaign.

## Planned Change 2026-06-17

Add the CLI smoke after the web/API local sample smoke proved local market and
authenticated `/api/ad` are working. This command covers the actual CLI wrapper
path: token lookup via env, `/api/ad`, spinner replacement, and child process
exit.

## Planned Fix 2026-06-17: Child Command Timeout

Bug: first real `corepack pnpm@9.12.0 smoke:local-cli` run built the CLI, then
the smoke phase produced no output before the 240s tool timeout. The local
server was not left running afterward, so the hang is likely inside the spawned
CLI/fake-ai command or cleanup around that child process.

Fix plan:

- Add a bounded timeout to the spawned CLI command.
- Kill the CLI child if it exceeds the timeout.
- Include captured stdout/stderr in the thrown error so the next run points at
  the real hang stage.
- Add a pure helper for the timeout value so tests lock the expected bound.

## Runtime Result 2026-06-17

The bounded timeout exposed the real failure: the CLI rendered the local sample
ad, emitted an OSC8 `/api/click` URL, called `/api/track` successfully, and then
timed out waiting for the CLI process to exit. Direct node-pty verification
showed that `onExit` fires for `node fake-ai.js`, but Windows node-pty can still
keep the Node event loop alive unless the CLI binary calls `process.exit`.

After `cli-wrapper/src/index.ts` was changed to explicitly exit on direct binary
completion, `corepack pnpm@9.12.0 smoke:local-cli` passed and printed:

`cli={"exitCode":0,"renderedLocalAd":true}`

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Documented passing local CLI smoke after direct binary exit fix. | Codex |
| 2026-06-17 | Planned CLI smoke child timeout. | Codex |
| 2026-06-17 | Planned local CLI smoke. | Codex |
