# extension-release.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Single source of truth for the latest published SpinShare extension version and
its VSIX download path, consumed by the version manifest endpoint.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `LATEST_EXTENSION_VERSION` | const string | Semver of the VSIX currently served at `/vsix`. |
| `EXTENSION_VSIX_PATH` | const string | Stable same-origin path (`/vsix`) of the VSIX download. |

## Important Notes / NEVER Change

- **INVARIANT:** `LATEST_EXTENSION_VERSION` MUST equal the `version` of
  `web/public/spinshare.vsix`. The `vscode-extension` `publish-prod` script
  rewrites this constant whenever it copies a new VSIX into `web/public`, so the
  advertised version can never get ahead of the downloadable artifact. Do not
  bump it by hand without also replacing the VSIX.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Added release constants for extension self-update. | Claude |
