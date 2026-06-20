# publish-prod.mjs

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

One command that publishes a new production VSIX for the self-updater, keeping
the three release artifacts that must agree in lockstep.

## What It Does

1. Builds the production VSIX (`packageVariant("prod")`).
2. Copies it to `web/public/spinshare.vsix` — the artifact `/vsix` serves.
3. Rewrites `LATEST_EXTENSION_VERSION` in `web/src/lib/extension-release.ts` —
   the version `/api/extension/version` advertises.

Run after bumping `version` in `vscode-extension/package.json`:
`corepack pnpm@9.12.0 --filter ./vscode-extension publish:prod`.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `publishProd` | Async function | Builds/copies the VSIX and rewrites the version constant; returns the paths touched. |

## Important Notes / NEVER Change

- This script exists to prevent drift between the served VSIX and the advertised
  version. Do not update one without the other; use this script.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-19 | `web/public/spinshare.vsix` was stale `0.2.1` while prod `0.2.2` existed. | `publish:prod` was not run after packaging. | Copied `spinshare-prod-0.2.2.vsix` → `web/public/spinshare.vsix`. SHA-256 now matches prod; embedded `version` is `0.2.2`, `baseUrl` is `https://www.spinshare.dev`. **Requires redeploy** for live static asset to update. |

## Agent Decisions / Thoughts

- **2026-06-19 Codex:** Prod and local `0.2.2` VSIX archives share identical
  compiled extension code; they differ only in `extension/package.json` /
  `extension.vsixmanifest` (`displayName`, `spinshare.baseUrl` default,
  `spinshare.autoUpdate` default). If local works, prod should work against
  production APIs.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Replaced stale public VSIX with byte-identical prod `0.2.2` artifact. | Codex |
| 2026-06-19 | Documented stale public `0.2.1` artifact and exact prod `0.2.2` replacement plan. | Codex |
| 2026-06-19 | Added publish script tying VSIX copy to the advertised version. | Claude |
