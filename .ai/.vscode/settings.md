# settings.json

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Workspace-local VS Code settings used while developing and testing the SpinShare extension.

## What It Does

- Keeps workspace-local VS Code settings used while developing this repo.
- Intentionally does not override `spinshare.baseUrl`, so local/prod VSIX
  manifest defaults can control the extension target environment.

## Public API

| Name | Type | Description |
|------|------|-------------|
| N/A | Workspace settings | No SpinShare base URL override is committed. |

## Dependencies

- Internal: `vscode-extension/src/extension.ts` reads this setting.
- External: VS Code workspace configuration.

## Important Notes / NEVER Change

- Production settings should use the canonical `https://spinshare-web-vert.vercel.app` host to avoid redirects on POST device-flow requests.
- Local development can use `http://localhost:3000`, but do not leave that in shared workspace settings.
- Do not commit `spinshare.baseUrl` here. The packaged local/prod VSIX defaults
  are the source of truth for extension target selection.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-18 | Local VSIX still installed Claude hooks pointing at production, so localhost dashboards stayed at zero after seeing ads. | The committed workspace setting `spinshare.baseUrl=https://spinshare-web-vert.vercel.app` overrides both local and prod VSIX manifest defaults. | Planned: remove the committed workspace override and let the installed VSIX flavor default choose `http://localhost:3000` for local or `https://spinshare-web-vert.vercel.app` for prod. |
| 2026-06-15 | Device sign-in showed `device/start failed (405): Server returned a non-JSON response.` | Workspace setting used `https://spinshare-web-vert.vercel.app`; Cloudflare redirects it to `https://spinshare-web-vert.vercel.app`, and POST redirect handling can arrive as a GET at the Next.js route, yielding 405 HTML. | Change the shared workspace setting to the canonical `https://spinshare-web-vert.vercel.app`. |

## Planned Change 2026-06-18 Local/Prod VSIX Linkage

Remove the committed `spinshare.baseUrl` workspace override from
`.vscode/settings.json`. Local and prod extension packages already set different
manifest defaults via `vscode-extension/scripts/package-variant.mjs`; a checked
in workspace override defeats that mechanism and makes the local package
generate production Claude hooks/shims.

After this change, switching variants still requires reloading the editor or
running the extension's rebuild/install path so `~/.claude/settings.json` points
at the newly resolved base URL.

## Implemented Change 2026-06-18 Local/Prod VSIX Linkage

`.vscode/settings.json` now contains an empty settings object. It no longer
sets `spinshare.baseUrl`, so installing the local VSIX can resolve
`http://localhost:3000` from its manifest default and installing the prod VSIX
can resolve `https://spinshare-web-vert.vercel.app` from its manifest default.

## Planned Change

Update `spinshare.baseUrl` from `https://spinshare-web-vert.vercel.app` to `https://spinshare-web-vert.vercel.app`.

## Implemented Change

`spinshare.baseUrl` now uses `https://spinshare-web-vert.vercel.app` in the shared workspace settings.

## Verification

- Production `POST https://spinshare-web-vert.vercel.app/api/auth/device/start` returned `200` JSON.
- Production `POST https://spinshare-web-vert.vercel.app/api/auth/device/start` returned a `301` HTML redirect to the canonical `www` host.
- Extension and CLI regression tests covering the old apex host now pass.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Removed committed `spinshare.baseUrl` override from workspace settings. | Codex |
| 2026-06-18 | Planned removal of committed `spinshare.baseUrl` override so VSIX local/prod defaults work. | Codex |
| 2026-06-15 | Canonicalized workspace `spinshare.baseUrl` to `https://spinshare-web-vert.vercel.app`. | Codex |
| 2026-06-15 | Created doc before canonicalizing the workspace SpinShare base URL. | Codex |
