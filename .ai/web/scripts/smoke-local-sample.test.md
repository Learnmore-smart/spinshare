# smoke-local-sample.test.mjs

> Last updated: 2026-06-17 | Protection: STANDARD

## Purpose

Tests pure helpers for the local sample smoke script.

## Planned Coverage

- Accepts a `/api/market` response containing the seeded local campaign.
- Rejects empty, malformed, or non-local market responses.
- Produces a compact summary with live campaign count, campaign id, ad text,
  bid label, and remaining budget.
- Accepts authenticated local sample `/api/ad` responses and rejects non-local
  ad responses.
- Verifies the JSON POST helper sends `method: "POST"`, JSON content type, and
  a serialized body.
- Verifies the Windows process-tree kill command uses `taskkill /t /f` so the
  real smoke command can exit after a successful run.

## Implemented Coverage 2026-06-17

The test imports pure helpers from `smoke-local-sample.mjs` and covers:

- accepting the seeded local market response;
- rejecting missing, empty, non-local, and old production-like responses;
- summarizing the local campaign for smoke output;
- accepting and summarizing the authenticated local sample ad response;
- returning the Windows `taskkill.exe /pid <pid> /t /f` process-tree kill
  command.
- building JSON POST request init for device endpoints.

## Verification 2026-06-17

- RED: focused test failed because `smoke-local-sample.mjs` did not exist.
- RED: focused test failed because `processTreeKillCommand` was not exported.
- RED: focused test failed because `isLocalSampleAdResponse` was not exported.
- RED: focused test failed because `jsonPostInit` was not exported.
- GREEN final:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\smoke-local-sample.test.mjs`
  passed with 6 tests.

## Dependencies

- External: `vitest`.
- Internal: `web/scripts/smoke-local-sample.mjs`.

## Important Notes / NEVER Change

- Keep tests pure; do not start a Next dev server from the unit test.
- The actual runtime smoke should be run through the CLI/root script.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented authenticated ad and JSON POST helper coverage. | Codex |
| 2026-06-17 | Planned JSON POST helper coverage. | Codex |
| 2026-06-17 | Planned authenticated ad helper coverage. | Codex |
| 2026-06-17 | Implemented smoke helper tests. | Codex |
| 2026-06-17 | Planned process cleanup helper coverage. | Codex |
| 2026-06-17 | Planned smoke helper tests. | Codex |
