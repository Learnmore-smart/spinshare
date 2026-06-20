# Production Click Origin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure production ad click URLs use `https://www.spinshare.dev` instead of Cloud Run's internal `0.0.0.0:8080` origin while preserving request-origin behavior for local development.

**Architecture:** Keep URL correction at the `/api/ad` response boundary, where tracked URLs are created. Select the configured canonical `NEXTAUTH_URL` when present and otherwise use `request.url`; clients continue consuming the absolute `destinationUrl` without changes.

**Tech Stack:** Next.js App Router route handler, TypeScript, Vitest.

---

### Task 1: Add the production-origin regression test

**Files:**
- Modify: `web/src/app/api/ad/route.test.ts`

- [x] **Step 1: Include `NEXTAUTH_URL` in test environment restoration**

Add `"NEXTAUTH_URL"` to `ENV_KEYS` so the test cannot leak canonical-origin configuration into other cases.

- [x] **Step 2: Add the failing Cloud Run regression test**

Create an authenticated request for `http://0.0.0.0:8080/api/ad`, set `process.env.NEXTAUTH_URL = "https://www.spinshare.dev"`, and assert:

```ts
expect(body.destinationUrl).toMatch(
  /^https:\/\/www\.spinshare\.dev\/api\/click\?campaignId=cmp_prod&clickToken=.+/,
);
```

- [x] **Step 3: Run the focused test and verify RED**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/ad/route.test.ts
```

Expected: the new case fails because the actual URL begins with `http://0.0.0.0:8080/api/click`.

### Task 2: Resolve click URLs from the canonical deployment origin

**Files:**
- Modify: `web/src/app/api/ad/route.ts`

- [x] **Step 1: Add minimal origin selection**

Change tracked URL construction to use configured `NEXTAUTH_URL` when non-empty and retain the request URL as fallback:

```ts
const baseUrl = process.env.NEXTAUTH_URL?.trim() || request.url;
const destinationUrl = new URL("/api/click", baseUrl);
```

- [x] **Step 2: Run the focused test and verify GREEN**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/ad/route.test.ts
```

Expected: all ad route tests pass.

- [x] **Step 3: Run web verification**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test
corepack pnpm@9.12.0 --filter @spinshare/web lint
```

Expected: both commands exit successfully with no test failures or type errors.

### Task 3: Synchronize documentation

**Files:**
- Modify: `.ai/web/src/app/api/ad/route.md`
- Modify: `.ai/web/src/app/api/ad/route.test.md`

- [x] **Step 1: Record implementation and RED/GREEN evidence**

Update both mirrored docs with the final behavior, focused test failure, focused test pass, and full verification results.

- [x] **Step 2: Review final diff**

Run:

```powershell
git diff -- web/src/app/api/ad/route.ts web/src/app/api/ad/route.test.ts .ai/web/src/app/api/ad/route.md .ai/web/src/app/api/ad/route.test.md docs/superpowers/plans/2026-06-20-production-click-origin.md
```

Expected: only the approved click-origin fix, regression coverage, and associated documentation appear.
