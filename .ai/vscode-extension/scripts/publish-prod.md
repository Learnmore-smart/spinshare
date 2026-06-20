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

## Bug Fix Plan 2026-06-19 Stale public production artifact

**Bug:** `web/public/spinshare.vsix` and the live static asset are version
`0.2.1`, while the intended production artifact is
`vscode-extension/spinshare-prod-0.2.2.vsix`.

**Root Cause:** The prod `0.2.2` package was built, but the public release copy
step was not run before deployment. The advertised source version was updated
separately, allowing the repository and deployed artifact to drift.

**Evidence:** The prod/local `0.2.2` archives contain identical executable
entries and differ only in `extension/package.json` and
`extension.vsixmanifest`. The prod manifest defaults to
`https://www.spinshare.dev`; the local manifest defaults to
`http://localhost:3000`. The live static asset SHA-256 matches the repository's
stale `web/public` file and embeds version `0.2.1`.

**Fix Strategy:** Copy the exact prod `0.2.2` artifact to
`web/public/spinshare.vsix`, never the local artifact, and verify byte-for-byte
hash equality plus the embedded version/base URL before deployment.

**Test Plan:** Compare SHA-256 hashes, inspect `extension/package.json` inside
the public VSIX, run the web route test/build, and re-download the deployed
artifact for the same checks after deployment.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Documented stale public `0.2.1` artifact and exact prod `0.2.2` replacement plan. | Codex |
| 2026-06-19 | Added publish script tying VSIX copy to the advertised version. | Claude |
