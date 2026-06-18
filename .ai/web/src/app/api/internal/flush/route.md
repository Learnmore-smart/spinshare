# web/src/app/api/internal/flush/route.ts

> Last updated: 2026-06-16 | Protection: CRITICAL

## Purpose

Internal HTTP trigger for the hot-counter to durable-ledger reconciliation cycle.

## What It Does

- Exposes a protected endpoint that calls `runFlushCycle()` with the current
  composition-root adapters.
- Intended for production schedulers and manual operator checks, not browser UI
  or public clients.
- Requires a bearer secret from `SPINSHARE_FLUSH_SECRET` or `CRON_SECRET`.
- Returns `503 { error: "flush_secret_not_configured" }` when no secret is
  configured.
- Returns `401 { error: "unauthorized" }` for missing/wrong bearer auth.
- Returns a compact JSON summary of the flush result.
- Fails closed if no secret is configured.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `POST` | route handler | Runs one flush cycle after secret validation. |

## Dependencies

- **Internal:** `@/server/container` - supplies counters, ledger, users, and campaigns.
- **Internal:** `@/server/flush-service` - performs the reconciliation logic.

## Agent Decisions / Thoughts

- **2026-06-16 Codex:** This endpoint closes the P0 product gap where `/api/track`
  settles into the hot counter store but dashboards and payouts read durable
  Firestore state. The route must be protected because it mutates financial
  records. Use a shared bearer secret so it can be called by Cloud Scheduler,
  Vercel Cron, or another ops runner without requiring a browser session.
- **2026-06-16 Codex:** Prefer `POST` because flush mutates state. If the final
  deployment platform only supports GET cron invocations, add an explicit GET
  handler later with the same bearer-secret gate rather than making this route
  public.

## Important Notes / NEVER Change

- Never run flush without an operator/scheduler secret.
- Never expose raw internal exception messages in the HTTP response.
- Do not debit/credit money in the route itself; all money movement belongs in
  `runFlushCycle()`.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-16 | Dashboard/payout durable state can stay stale after credited impressions. | The service existed but no route/scheduler trigger was present. | Add a protected internal flush trigger endpoint. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented protected POST route with fail-closed secret handling and safe flush result response. | Codex |
| 2026-06-16 | Created plan for protected flush trigger endpoint. | Codex |
