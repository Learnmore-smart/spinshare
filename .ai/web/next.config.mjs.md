# web/next.config.mjs

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Next.js application configuration for the SpinShare web app.

## What It Does

- Enables React strict mode and standalone output for container deploys.
- Loads environment variables from the **repository root** `.env` via `@next/env` `loadEnvConfig`, so `web/.env` is not required.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `default` export | `NextConfig` | Next.js config object. |

## Dependencies

- **External:** `@next/env` (via `next`) — `loadEnvConfig` for monorepo root `.env`.
- **Internal:** repo-root `.env` — single source of truth for local and script tooling.

## Important Notes / NEVER Change

- `loadEnvConfig` must pass `forceReload: true` (4th argument) so Next.js does not return a cached empty result from the `web/` directory before user config runs (monorepo gotcha).
- Do not reintroduce a separate `web/.env`; it previously diverged from root `.env` and caused Google `deleted_client` OAuth errors.
- Production deploys (Cloud Run) inject env at runtime; root `.env` is for local dev and `verify-prod-env.mjs`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Load repo-root `.env` in config; remove need for `web/.env` link. | Cursor |
