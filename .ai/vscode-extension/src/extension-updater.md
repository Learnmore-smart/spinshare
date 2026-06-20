# extension-updater.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Gives the sideloaded SpinShare extension its own auto-update path, since the
editor only auto-updates Marketplace extensions and SpinShare ships as a `.vsix`.

## What It Does

- Polls `GET /api/extension/version` on the configured base URL for the latest
  published version + VSIX download URL.
- Compares the advertised version against the running extension version using a
  `major.minor.patch` semver comparison (prerelease/build suffixes ignored).
- When a newer version exists, downloads the VSIX into the extension's download
  directory and installs it in place via the stable
  `workbench.extensions.installExtension` command.
- Offers a (never forced) window reload via `workbench.action.reloadWindow`.
- Falls back to opening the download URL in the browser if in-place install
  fails (e.g. an editor fork without the install command).

## Public API

| Name | Type | Description |
|------|------|-------------|
| `ExtensionUpdater` | Class | Polls, downloads, and installs newer VSIX releases. |
| `ExtensionUpdater.checkForUpdate` | Method | Returns the release only when it is newer than the running version, else `null`. |
| `ExtensionUpdater.run` | Method | Full check-and-update cycle; `{ manual: true }` surfaces an "up to date" / failure message. |
| `compareSemver` | Function | Compares two versions by release segments. |
| `isUpdateAvailable` | Function | True when `latest` is strictly newer than `current`. |
| `parseReleaseInfo` | Function | Validates an `/api/extension/version` payload. |

## Dependencies

- **Internal:** none. The server contract lives in `web` (`extension-release.ts`
  + `api/extension/version/route.ts`).
- **External:** injectable `fetch`, `node:fs/promises`, and a small slice of the
  `vscode` namespace (all defaulted/injected for testability).

## Agent Decisions / Thoughts

- **2026-06-19 Claude:** SpinShare is installed via `code --install-extension
  spinshare.vsix`, so the editor never auto-updates it. A self-updater that
  reinstalls the VSIX is the only path that works for both prod and the local
  dev flavor without publishing to a Marketplace (which the ad-serving model and
  the dual prod/local variants do not fit).
- **2026-06-19 Claude:** The version endpoint returns a same-origin VSIX URL, so
  the same updater code updates a prod install from prod and a localhost install
  from localhost — each from whatever host it is pointed at.
- **2026-06-19 Claude:** The reload is always prompted, never automatic, so an
  update can never interrupt work mid-task.
- **2026-06-19 Claude:** If `currentVersion` cannot be read from the extension
  manifest, the host skips scheduling rather than risk treating every release as
  newer (a `0.0.0` fallback would re-install endlessly).

## Important Notes / NEVER Change

- Never reload the window without explicit user consent.
- Treat any network error / non-OK status / malformed payload as "no update";
  never throw out of `checkForUpdate`/`run`.
- The local dev flavor must default `spinshare.autoUpdate` to `false` (set in
  `package-variant.mjs`) so a localhost build never reinstalls itself.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Added self-updater (version poll → in-place VSIX reinstall → prompted reload). | Claude |
