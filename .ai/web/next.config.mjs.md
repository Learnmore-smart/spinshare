# web/next.config.mjs

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Next.js application configuration for the SpinShare web app.

## What It Does

- Enables React strict mode and standalone output for container deploys.
- Loads environment variables from the **repository root** `.env` via `@next/env` `loadEnvConfig`, so `web/.env` is not required.
- Leaves `/vsix` handling to the dedicated App Router handler. A config-level
  redirect must not preempt that route because Next can build its absolute
  `Location` header from the container-internal host.

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
- Do not add a `redirects()` rule for `/vsix`; `web/src/app/vsix/route.ts` owns
  the stable download endpoint.

## Bug Fix Plan 2026-06-19 Production VSIX redirect leaks internal host

**Bug:** The live `https://spinshare.dev/vsix` endpoint redirects to
`https://0.0.0.0:8080/spinshare.vsix`, so `curl -L` cannot download the
extension.

**Root Cause:** An uncommitted `next.config.mjs` redirect for `/vsix` preempts
the dedicated route handler. In the Cloud Run standalone container, Next
constructs the absolute redirect from its internal `0.0.0.0:8080` origin.

**Fix Strategy:** Remove the redundant config redirect and keep download
routing in the dedicated `/vsix` route, which will emit a host-independent
relative location.

**Regression Risk:** If both routing mechanisms return, the config redirect can
silently preempt the tested route again.

**Test Plan:** Add a route regression test using an internal request origin and
assert that the response location remains `/spinshare.vsix`; then verify the
built app endpoint with `curl -L`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Documented removal of the production `/vsix` config redirect that leaks the container hostname. | Codex |
| 2026-06-15 | Set `turbopack.root` to monorepo root so Turbopack resolves `next` in pnpm workspace. | Cursor |
| 2026-06-14 | Load repo-root `.env` in config; remove need for `web/.env` link. | Cursor |
