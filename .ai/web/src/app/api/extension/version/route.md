# api/extension/version/route.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Serves the latest-release manifest the sideloaded extension's self-updater polls
to decide whether to reinstall a newer VSIX.

## What It Does

- `GET /api/extension/version` returns `{ version, url }`.
- `version` is {@link LATEST_EXTENSION_VERSION} from
  `web/src/lib/extension-release.ts` (the single source of truth, kept in sync
  with the served VSIX by the `publish-prod` script).
- `url` is the `/vsix` download endpoint resolved against the request origin, so
  prod, localhost, and the local flavor each get a same-origin download URL.
- Response is `Cache-Control: no-store` so a freshly deployed version is picked
  up on the next poll.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `GET` | Route handler | Returns the latest extension version + VSIX URL. |
| `dynamic = "force-dynamic"` | Export | Always evaluate at request time. |

## Dependencies

- **Internal:** `@/lib/extension-release` (`LATEST_EXTENSION_VERSION`,
  `EXTENSION_VSIX_PATH`).
- **External:** Web `Request`/`Response`.

## Important Notes / NEVER Change

- `version` must always match the VSIX served at `/vsix`. Update it only via the
  `publish-prod` script, never by hand alone.
- Keep the payload tiny and uncached; the extension polls it periodically.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Added version manifest endpoint for extension self-update. | Claude |
