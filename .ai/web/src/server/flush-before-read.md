# web/src/server/flush-before-read.ts

> Last updated: 2026-06-16 | Protection: CRITICAL

## Purpose

Best-effort reconciliation helper used immediately before user-facing reads that
must reflect recently credited impressions.

## What It Does

- Runs one bounded `runFlushCycle()` against the current container.
- Converts hot pending impression credits into durable ledger/user/campaign
  records before dashboard or payout reads.
- Never throws to the caller; failed reconciliation is logged and the page/API
  continues to return the last durable state.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `flushPendingForRead(container, context?)` | function | Best-effort one-cycle flush before reading durable account state. |

## Dependencies

- **Internal:** `runFlushCycle` - owns reconciliation correctness.
- **Internal:** `Container` - supplies counter, ledger, user, and campaign ports.

## Agent Decisions / Thoughts

- **2026-06-16 Codex:** This is not a scheduler replacement. It is a
  read-your-writes guard for user-visible dashboard/payout reads so pending
  credits do not stay invisible when the external scheduler has not run yet.
- **2026-06-16 Codex:** The helper must swallow errors. A failing RTDB/Firestore
  flush should not make the whole dashboard unavailable; it should leave durable
  data unchanged and log enough context for debugging.
- **2026-06-16 Codex:** Implemented as a one-cycle `runFlushCycle()` wrapper and
  wired into developer dashboard layout plus payout status reads.

## Important Notes / NEVER Change

- Do not duplicate reconciliation math here; delegate to `runFlushCycle()`.
- Do not throw flush failures into dashboard render or payout status reads.
- Keep the cycle bounded. User-facing reads should not drain unbounded queues.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-16 | Dashboard/payout reads could stay stale until an external flush scheduler ran. | User-visible reads only looked at durable ledger/balance, while `/api/track` credits first land in pending hot counters. | Add a best-effort flush helper and call it before durable account reads. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented helper and documented dashboard/payout read usage. | Codex |
| 2026-06-16 | Created planned helper documentation before implementation. | Codex |
