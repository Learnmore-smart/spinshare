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

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented direct checkout campaign creation regression coverage. | Codex |
| 2026-06-17 | Planned direct checkout campaign creation regression coverage. | Codex |
| 2026-06-16 | Implemented dashboard checkout reconciliation regression coverage. | Codex |
| 2026-06-16 | Planned dashboard checkout reconciliation regression coverage. | Codex |
| 2026-06-16 | Implemented read-time flush regression coverage for advertiser campaigns. | Codex |
| 2026-06-16 | Planned read-time flush regression coverage for advertiser campaigns. | Codex |
| 2026-06-15 | Planned campaign telemetry API tests. | Codex |
| 2026-06-15 | Implemented campaign telemetry API tests. | Codex |
