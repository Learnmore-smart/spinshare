# web/src/app/vsix/route.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Provides the stable `/vsix` production download endpoint for the SpinShare
editor extension.

## What It Does

- Redirects `/vsix` to the version-independent static asset
  `/spinshare.vsix`.
- Uses a relative `Location` header so reverse proxies and Cloud Run internal
  hostnames cannot alter the public destination.
- Keeps caching revalidation explicit while the static asset carries the
  packaged extension bytes.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `GET` | Route handler | Returns a `308` response pointing to `/spinshare.vsix`. |
| `dynamic` | Route setting | Forces the handler to run dynamically. |

## Dependencies

- **Internal:** `web/public/spinshare.vsix` — production VSIX served by the web app.

## Agent Decisions / Thoughts

- **2026-06-19 Codex:** A relative `Location` header is safer than deriving an
  absolute URL from `request.url`; the deployed request origin may be the
  container address rather than the public reverse-proxy host.

## Important Notes / NEVER Change

- Never point this route at a local-flavor VSIX.
- Do not derive the redirect host from the server-side request URL.
- Do not duplicate this route with a `next.config.mjs` redirect.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-19 | Live `/vsix` redirects to `0.0.0.0:8080`. | Handler used `new URL("/spinshare.vsix", request.url)`; on Cloud Run `request.url` is the internal `0.0.0.0:8080` origin. A redundant `next.config.mjs` redirect could also preempt this route. | `GET` now sets `Location: "/spinshare.vsix"` with no `request` dependency. Config redirect removed. Covered by `route.test.ts`. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented relative `Location` redirect; removed config-level duplicate. | Codex |
| 2026-06-19 | Created mirror and documented the production redirect fix plan. | Codex |
