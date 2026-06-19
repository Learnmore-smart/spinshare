# route.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests authenticated advertiser campaign API behavior.

## Planned Change

Add red coverage that `GET /api/campaigns` returns zero-filled telemetry for
quiet campaigns and populated telemetry for campaigns with aggregate counters.

## Implemented Change

Added coverage for zero-filled campaign telemetry, owned-campaign scoping, and
durable ledger counts contributing to credited impressions.

## Planned Change 2026-06-16 Advertiser Read-Time Flush

Add a RED regression test proving `GET /api/campaigns` drains pending hot-path
impressions before building the advertiser campaign view. The fixture should
enqueue a real pending impression through `container.counters.applyImpression`,
then call `GET /api/campaigns` and expect the returned campaign to include the
flushed budget decrement and credited count. Without the route-level
`flushPendingForRead` call, the campaign remains stale and the test fails.

## Implemented Change 2026-06-16 Advertiser Read-Time Flush

Added coverage that seeds a funded campaign, enqueues a pending impression in
the hot counter store, seeds the credited developer so flush can apply the
balance delta, and verifies `GET /api/campaigns` returns the flushed campaign
budget and credited durable count.

RED verification before implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
failed with stale `budgetCents: 5000` and `telemetry.credited: 0`.

GREEN verification after implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
passed 5 tests.

## Planned Change 2026-06-16 Dashboard Checkout Reconciliation

Add RED coverage for the local/Stripe symptom: a campaign owned through the
checkout email has a `checkoutStarted` activity and Stripe reports the session
as paid, but no webhook has applied funding yet. `GET /api/campaigns` should
reconcile that session, return the campaign with funded budget, and record a
`budgetFunded` activity. Without the route-level reconciliation call, the
campaign remains at `budgetCents: 0` and the test fails.

## Implemented Change 2026-06-16 Dashboard Checkout Reconciliation

Added route coverage that injects a checkout-session lookup gateway, records a
pending `checkoutStarted` activity for a public email-owned campaign, and
verifies `GET /api/campaigns` applies funding once, returns `budgetCents: 500`,
and records a `budgetFunded` row. A repeat dashboard read confirms the
idempotency gate prevents double-credit.

RED verification before implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
failed with returned `budgetCents: 0`.

GREEN verification after implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
passed 6 tests.

## Planned Change 2026-06-17 Direct Checkout On Campaign Create

Add RED coverage for authenticated dashboard creation with a `blockCount`:

- request body includes valid campaign fields plus `blockCount`;
- response is still a successful creation response;
- body includes the created campaign and a checkout `url` / `sessionId`;
- checkout amount equals `cpmCents * blockCount`;
- mock checkout settlement updates the stored campaign budget;
- activity history records `checkoutStarted` and `budgetFunded`.

Also keep existing safety coverage proving unsafe ad copy creates no campaign
or checkout.

## Implemented Change 2026-06-17 Direct Checkout On Campaign Create

Added coverage for authenticated campaign creation with `blockCount`, asserting
the route returns a Checkout Session URL/id, derives the amount from CPM times
blocks, applies settled mock funding, and records checkout/funding activity
rows.

RED verification before implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-builder.test.tsx`
failed because create-with-blockCount returned no `sessionId`.

GREEN verification after implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-builder.test.tsx`
passed 9 tests after rebuilding `@spinshare/core`.

## Planned Coverage 2026-06-18 Campaign Edit Endpoint

Add RED coverage for `PATCH /api/campaigns`:

- an owner can update ad text, destination URL, brand fields, leaderboard
  visibility, and CPM
- same-email public checkout campaigns can be edited by the signed-in account
  that claims the public advertiser id
- non-owners are rejected with `403`
- unsafe ad copy is rejected before mutating the stored campaign

## Implemented Coverage 2026-06-18 Campaign Edit Endpoint

Added route coverage for owner edits, same-email public checkout edits,
non-owner rejection, and unsafe ad-copy rejection before mutation.

Verification:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/api/funds/checkout/route.test.ts`
passed 19 tests.

## Planned Coverage 2026-06-18 Delete HMR Compatibility

Add RED coverage for a development-HMR stale campaign repository object that
has the legacy memory adapter shape but no `delete()` method. `DELETE
/api/campaigns` should still remove an owned unpaid campaign instead of
throwing `TypeError: campaigns.delete is not a function`.

## Implemented Coverage 2026-06-18 Delete HMR Compatibility

Added a regression that shadows `delete` on a live memory campaign repository,
simulating the stale development singleton. RED reproduced
`campaigns.delete is not a function`; GREEN passes after the route uses the
compatibility delete helper.

## Verification 2026-06-18 Delete HMR Compatibility

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts` passed.

## Planned Coverage 2026-06-18 Brand Icon Upload Edit

Add RED coverage that `PATCH /api/campaigns` accepts a 64 KiB PNG data URL for
`brandIconDataUrl`. This reproduces the dashboard symptom where choosing an
allowed-size logo causes the edit request to return `400`.

## Implemented Coverage 2026-06-18 Brand Icon Upload Edit

Added a PATCH regression that submits a 64 KiB PNG data URL as
`brandIconDataUrl`, expects `200`, and verifies the campaign repository persists
the icon. The test failed with the old core build and passes after rebuilding the
updated core schema.

## Verification 2026-06-18 Brand Icon Upload Edit

- `corepack pnpm@9.12.0 --filter @spinshare/core build` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented brand icon upload edit regression coverage. | Codex |
| 2026-06-18 | Planned brand icon upload edit regression coverage. | Codex |
| 2026-06-18 | Implemented HMR-compatible delete fallback regression coverage. | Codex |
| 2026-06-18 | Planned HMR-compatible delete fallback regression coverage. | Codex |
| 2026-06-18 | Implemented PATCH endpoint regression coverage. | Codex |
| 2026-06-18 | Planned PATCH endpoint regression coverage. | Codex |
| 2026-06-17 | Implemented direct checkout campaign creation regression coverage. | Codex |
| 2026-06-17 | Planned direct checkout campaign creation regression coverage. | Codex |
| 2026-06-16 | Implemented dashboard checkout reconciliation regression coverage. | Codex |
| 2026-06-16 | Planned dashboard checkout reconciliation regression coverage. | Codex |
| 2026-06-16 | Implemented read-time flush regression coverage for advertiser campaigns. | Codex |
| 2026-06-16 | Planned read-time flush regression coverage for advertiser campaigns. | Codex |
| 2026-06-15 | Planned campaign telemetry API tests. | Codex |
| 2026-06-15 | Implemented campaign telemetry API tests. | Codex |
