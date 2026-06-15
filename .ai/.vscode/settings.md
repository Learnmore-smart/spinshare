# settings.json

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Workspace-local VS Code settings used while developing and testing the SpinShare extension.

## What It Does

- Overrides `spinshare.baseUrl` for the extension when this repository is open.
- Affects the browser device sign-in flow and terminal auto-wrap launcher generation.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `spinshare.baseUrl` | VS Code setting | Base URL used by the extension for SpinShare HTTP APIs. |

## Dependencies

- Internal: `vscode-extension/src/extension.ts` reads this setting.
- External: VS Code workspace configuration.

## Important Notes / NEVER Change

- Production settings should use the canonical `https://www.spinshare.dev` host to avoid redirects on POST device-flow requests.
- Local development can use `http://localhost:3000`, but do not leave that in shared workspace settings.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-15 | Device sign-in showed `device/start failed (405): Server returned a non-JSON response.` | Workspace setting used `https://spinshare.dev`; Cloudflare redirects it to `https://www.spinshare.dev`, and POST redirect handling can arrive as a GET at the Next.js route, yielding 405 HTML. | Change the shared workspace setting to the canonical `https://www.spinshare.dev`. |

## Planned Change

Update `spinshare.baseUrl` from `https://spinshare.dev` to `https://www.spinshare.dev`.

## Implemented Change

`spinshare.baseUrl` now uses `https://www.spinshare.dev` in the shared workspace settings.

## Verification

- Production `POST https://www.spinshare.dev/api/auth/device/start` returned `200` JSON.
- Production `POST https://spinshare.dev/api/auth/device/start` returned a `301` HTML redirect to the canonical `www` host.
- Extension and CLI regression tests covering the old apex host now pass.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Canonicalized workspace `spinshare.baseUrl` to `https://www.spinshare.dev`. | Codex |
| 2026-06-15 | Created doc before canonicalizing the workspace SpinShare base URL. | Codex |
