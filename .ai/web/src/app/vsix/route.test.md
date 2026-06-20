# web/src/app/vsix/route.test.ts

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Prevents the public VSIX download endpoint from leaking an internal deployment
hostname into its redirect.

## What It Tests

- `GET /vsix` returns HTTP `308`.
- The `Location` header is the relative path `/spinshare.vsix`, even when the
  request URL uses the Cloud Run-style internal origin `0.0.0.0:8080`.
- The route keeps its explicit revalidation cache policy.

## Dependencies

- **Internal:** `web/src/app/vsix/route.ts`.
- **External:** Vitest.

## Agent Decisions / Thoughts

- **2026-06-19 Codex:** The regression input deliberately uses the observed
  production failure origin so the old absolute-URL implementation fails for
  the same reason as the live endpoint.

## Important Notes / NEVER Change

- Keep the internal-host request case; a normal public-origin test would not
  catch this regression.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Documented the planned `/vsix` internal-host regression test. | Codex |
