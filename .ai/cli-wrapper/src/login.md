# login.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Runs `spinshare login`: browser device-flow authentication and credential
storage for the CLI.

## What It Does

- Starts the device authorization flow.
- Opens the browser or prints the verification URL.
- Polls until approved/denied/expired.
- Stores the issued Device_Auth_Token in the CLI credential store.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `runLogin` | Function | Runs the full login flow and returns an exit code. |
| `openSystemBrowser` | Function | Opens a URL in the platform default browser. |

## Planned Change 2026-06-15

After a successful token save, allow `runLogin` to run an optional post-login
setup callback. The CLI entrypoint will use this to install the Claude Code
hooks/statusLine adapter automatically after `spinshare login`, while tests can
inject a fake callback.

The callback must be best-effort: if Claude setup fails after a valid token is
stored, login should still return success and print a warning, because auth
itself succeeded.

## Implemented Change 2026-06-15

`RunLoginDeps.afterTokenStored` is now called after the Device_Auth_Token is
saved. Errors from this callback are reported as `Claude Code setup warning`
without changing the successful login exit code.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented post-login setup callback. | Codex |
| 2026-06-15 | Created doc before adding post-login Claude Code setup hook. | Codex |
