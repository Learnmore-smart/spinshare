# Market Delivery Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show real settled-versus-purchased impression progress in a new right-hand public leaderboard column.

**Architecture:** Campaigns created after this change carry a durable optional `purchasedImpressions` counter initialized at zero. Funding atomically increments both remaining budget and that counter, while the public market combines it with existing per-campaign ledger counts and reconstructs totals only for legacy documents without the counter. Checkout metadata carries exact inventory through Stripe, mock settlement, webhooks, and reconciliation.

**Tech Stack:** TypeScript, Next.js App Router, React 18, Tailwind CSS, Firestore Admin SDK, Stripe Checkout, Vitest.

---

## File map

- Domain and persistence: `packages/core/src/types.ts`, `web/src/server/ports/campaign-repository.ts`, both campaign repository adapters, `web/src/server/adapters/firestore/collections.ts`.
- Funding transport and settlement: payment gateway port/adapters, campaign review seam, three checkout routes, Stripe webhook, and checkout reconciliation.
- Public read model: `web/src/app/api/market/route.ts` and its test.
- Presentation: new `web/src/app/market-delivery-progress.tsx`, component test, homepage table, and i18n dictionaries/types.
- Seed compatibility: `web/scripts/seed-ad-market.mjs` and its test.
- Mirror docs: update each matching `.ai/.../*.md` before its code file.

### Task 1: Add durable campaign inventory accounting

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `web/src/server/ports/campaign-repository.ts`
- Modify: `web/src/server/ports/__contracts__/campaign-repository.contract.ts`
- Modify: `web/src/server/adapters/firestore/collections.ts`
- Modify: `web/src/server/adapters/firestore/campaign-repo.ts`
- Modify: `web/src/server/adapters/memory/memory-campaign-repository.ts`

- [ ] **Step 1: Document all six files in their matching `.ai/` mirrors**

Record that `purchasedImpressions` is optional only for legacy Firestore documents, new campaigns initialize it to zero, and `applyFunding` is the only positive-funding operation.

- [ ] **Step 2: Write the failing repository contract**

Add this behavior to the shared contract:

```ts
it("applyFunding increments budget and purchased inventory together", async () => {
  const repo = await harness.makeRepo();
  const created = await repo.create(newCampaign());
  expect(created.purchasedImpressions).toBe(0);

  await repo.applyFunding(created.id, {
    amountCents: 5_000,
    purchasedImpressions: 2_000,
  });

  const funded = await repo.getById(created.id);
  expect(funded?.budgetCents).toBe(5_000);
  expect(funded?.purchasedImpressions).toBe(2_000);

  await repo.applyBudgetDeltaCents(created.id, -1_000);
  expect((await repo.getById(created.id))?.purchasedImpressions).toBe(2_000);
});
```

- [ ] **Step 3: Run the memory contract and verify RED**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-campaign-repository.contract.test.ts
```

Expected: TypeScript/runtime failure because `applyFunding` does not exist and new campaigns do not expose `purchasedImpressions`.

- [ ] **Step 4: Add the domain and repository contract**

Add to `Campaign`:

```ts
/** Cumulative inventory bought through settled funding; absent on legacy rows. */
purchasedImpressions?: number;
```

Add to `CampaignRepository`:

```ts
applyFunding(
  id: string,
  input: { amountCents: number; purchasedImpressions: number },
): Promise<void>;
```

- [ ] **Step 5: Implement both adapters and the Firestore mapper**

New campaigns must include `purchasedImpressions: 0`. Memory `applyFunding` increments both fields when tracking exists. Firestore performs one transaction and writes:

```ts
const fields: Record<string, unknown> = {
  budgetCents: FieldValue.increment(input.amountCents),
  updatedAt: FieldValue.serverTimestamp(),
};
if (typeof doc.data()?.purchasedImpressions === "number") {
  fields.purchasedImpressions = FieldValue.increment(input.purchasedImpressions);
}
tx.update(ref, fields);
```

`toCampaign` includes the optional field only for safe, non-negative integers.

- [ ] **Step 6: Run memory and Firestore contracts and verify GREEN**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/core build
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-campaign-repository.contract.test.ts src/server/adapters/firestore/campaign-repo.contract.test.ts
```

The Firestore contract may skip when its emulator prerequisite is unavailable; the memory contract must pass.

### Task 2: Carry exact purchased inventory through payment gateways

**Files:**
- Modify: `web/src/server/ports/payment-gateway.ts`
- Modify: `web/src/server/adapters/memory/mock-payment-gateway.ts`
- Modify: `web/src/server/adapters/memory/memory-adapters.test.ts`
- Modify: `web/src/server/adapters/stripe/stripe-gateway.ts`
- Modify: `web/src/server/adapters/stripe/stripe-gateway.test.ts`

- [ ] **Step 1: Update matching `.ai/` docs with the metadata contract**

Document that new checkout inputs require a positive safe-integer `purchasedImpressions`, while parsed provider events/session reads keep it optional for legacy Stripe sessions.

- [ ] **Step 2: Write failing adapter tests**

For the mock gateway, create a session with `purchasedImpressions: 3_000` and expect retrieval to contain it. For Stripe projection, use metadata `{ campaignId: "cmp", purchasedImpressions: "3000" }` and expect the same integer; malformed metadata must produce `undefined`.

- [ ] **Step 3: Run both test files and verify RED**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-adapters.test.ts src/server/adapters/stripe/stripe-gateway.test.ts
```

Expected: assertions fail because payment DTOs and metadata projection omit purchased inventory.

- [ ] **Step 4: Extend payment DTOs**

Add required `purchasedImpressions` to `CheckoutInput`, and optional `purchasedImpressions` to `CheckoutSessionFunding` and `StripeEvent`.

- [ ] **Step 5: Implement metadata transport**

Stripe checkout metadata becomes:

```ts
metadata: {
  campaignId: input.campaignId,
  purchasedImpressions: String(input.purchasedImpressions),
},
```

Use one safe parser:

```ts
function metadataPurchasedImpressions(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}
```

Apply it in checkout-session retrieval and webhook projection. Preserve the optional property in mock retrieval and signed-event coercion.

- [ ] **Step 6: Run both test files and verify GREEN**

Use the command from Step 3 and require zero failures.

### Task 3: Settle budget and inventory through every funding path

**Files:**
- Modify: `web/src/server/campaign-review.ts`
- Modify: `web/src/server/campaign-review.test.ts`
- Modify: `web/src/app/api/advertiser-checkout/route.ts`
- Modify: `web/src/app/api/advertiser-checkout/route.test.ts`
- Modify: `web/src/app/api/campaigns/route.ts`
- Modify: `web/src/app/api/campaigns/route.test.ts`
- Modify: `web/src/app/api/funds/checkout/route.ts`
- Modify: `web/src/app/api/funds/checkout/route.test.ts`
- Modify: `web/src/app/api/webhooks/stripe/route.ts`
- Modify: `web/src/app/api/webhooks/stripe/route.test.ts`
- Modify: `web/src/server/checkout-reconciliation.ts`
- Modify: `web/src/app/api/checkout-status/route.test.ts`

- [ ] **Step 1: Update matching `.ai/` docs with the exact settlement flow**

Record `blockCount * 1_000`, legacy metadata derivation, and that all positive funding uses `applyFunding`.

- [ ] **Step 2: Write failing campaign-review and route tests**

Change the review helper test call to:

```ts
await creditCampaignBudgetWithReview(repo, campaign, {
  amountCents: 5_000,
  purchasedImpressions: 2_000,
});
expect((await repo.getById(campaign.id))?.purchasedImpressions).toBe(2_000);
```

Add assertions that every checkout gateway input contains the exact purchased count, webhook/checkout-status reconciliation credit it, and duplicate webhook delivery leaves it unchanged.

- [ ] **Step 3: Run focused settlement tests and verify RED**

Run `campaign-review.test.ts` plus the advertiser-checkout, campaigns, funds-checkout, Stripe-webhook, and checkout-status route tests. Expected failures must identify missing checkout metadata or unchanged campaign inventory.

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/campaign-review.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/campaigns/route.test.ts src/app/api/funds/checkout/route.test.ts src/app/api/webhooks/stripe/route.test.ts src/app/api/checkout-status/route.test.ts
```

- [ ] **Step 4: Implement a single legacy resolver and funding review input**

In `campaign-review.ts` add:

```ts
export interface CampaignFundingInput {
  amountCents: number;
  purchasedImpressions: number;
}

export function resolvePurchasedImpressions(
  explicit: number | undefined,
  amountCents: number,
  cpmCents: number,
): number | null {
  if (Number.isSafeInteger(explicit) && explicit! > 0) return explicit!;
  if (cpmCents <= 0 || amountCents <= 0 || amountCents % cpmCents !== 0) return null;
  const inferred = (amountCents / cpmCents) * 1_000;
  return Number.isSafeInteger(inferred) ? inferred : null;
}
```

`creditCampaignBudgetWithReview` accepts `CampaignFundingInput` and calls `campaigns.applyFunding`.

- [ ] **Step 5: Update all checkout and settlement callers**

Each checkout passes `purchasedImpressions: parsed.data.blockCount * 1_000`. Settled mock paths pass the same value to `applyFunding` or the review seam. Webhook and reconciliation resolve legacy metadata before claiming/applying funding; invalid inventory returns/continues without mutating campaign money.

- [ ] **Step 6: Run focused settlement tests and verify GREEN**

Use the exact Step 3 command and require zero failures.

### Task 4: Publish served-versus-purchased progress

**Files:**
- Modify: `web/src/app/api/market/route.test.ts`
- Modify: `web/src/app/api/market/route.ts`
- Modify: `web/scripts/seed-ad-market.test.mjs`
- Modify: `web/scripts/seed-ad-market.mjs`

- [ ] **Step 1: Update the four matching `.ai/` docs**

Record row-level public counts, fallback math, clamping, and seed inventory.

- [ ] **Step 2: Write failing market and seed tests**

Change the market expectation to:

```ts
expect(body.rows[0]).toMatchObject({
  servedImpressions: 2,
  purchasedImpressions: 2_000,
  deliveryPercent: 0.1,
});
```

Add a legacy fixture without `purchasedImpressions` and assert `served + floor(budget * 1000 / CPM)`. Add a seed assertion for `purchasedImpressions: blocks * 1_000`.

- [ ] **Step 3: Run both tests and verify RED**

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/market/route.test.ts scripts/seed-ad-market.test.mjs
```

Expected: row and seed document assertions fail because those fields are absent.

- [ ] **Step 4: Implement the market read model**

Change `toMarketRow` to accept the served count. Use persisted inventory when it is a safe positive integer; otherwise calculate:

```ts
const reconstructed =
  campaign.cpmCents > 0
    ? servedImpressions + Math.floor((campaign.budgetCents * 1_000) / campaign.cpmCents)
    : servedImpressions;
const purchasedImpressions = Math.max(servedImpressions, stored ?? reconstructed);
const deliveryPercent =
  purchasedImpressions === 0
    ? 0
    : Math.min(100, (servedImpressions / purchasedImpressions) * 100);
```

Add all three fields to `MarketRow`. Seed docs write `purchasedImpressions: c.blocks * 1_000`.

- [ ] **Step 5: Run both tests and verify GREEN**

Use the Step 3 command and require zero failures.

### Task 5: Render the accessible delivery column

**Files:**
- Create: `web/src/app/market-delivery-progress.tsx`
- Create: `web/src/app/market-delivery-progress.test.tsx`
- Modify: `web/src/app/page.tsx`
- Modify: `web/src/lib/i18n/types.ts`
- Modify: `web/src/lib/i18n/dictionaries.ts`

- [ ] **Step 1: Create/update matching `.ai/` docs before code**

The component doc must specify exact text, progressbar ARIA semantics, clamping, no animation, and responsive table placement.

- [ ] **Step 2: Write the failing component test**

Render the component to static markup and assert exact counts, a 25% width, and progressbar attributes:

```ts
const html = renderToStaticMarkup(
  <MarketDeliveryProgress
    servedImpressions={1_250}
    purchasedImpressions={5_000}
    deliveryPercent={25}
    ariaLabel="1,250 of 5,000 impressions delivered"
  />,
);
expect(html).toContain("1,250 / 5,000");
expect(html).toContain('role="progressbar"');
expect(html).toContain('aria-valuenow="25"');
expect(html).toContain('width:25%');
```

- [ ] **Step 3: Run the component test and establish RED**

The first run may report module-not-found because the component does not exist. Create only the exported component signature returning `null`, rerun, and require an assertion failure for the missing progress markup before implementing behavior.

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/market-delivery-progress.test.tsx
```

- [ ] **Step 4: Implement the focused component**

Create a component that clamps non-finite percentages, formats counts with `Intl.NumberFormat`, renders one numeric label, and uses a thin blue fill inside a neutral track. Do not add a chart library or animation.

- [ ] **Step 5: Add localized strings and wire the table**

Add `delivery` and `deliveryProgressLabel(served, purchased)` to English, Chinese, and French dictionaries. Extend the homepage `MarketRow`, add the component import, and change the grid to:

```tsx
grid-cols-[32px_minmax(240px,1fr)_140px_200px]
```

Increase the table minimum width to `min-w-[760px]`, add the Delivery header after bid, and render the component at the right of each row.

- [ ] **Step 6: Run component and homepage tests and verify GREEN**

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/market-delivery-progress.test.tsx src/app/page.test.tsx
```

Expected: all selected tests pass.

### Task 6: Synchronize docs and verify the complete change

**Files:**
- Modify: every `.ai/` mirror touched in Tasks 1–5
- Review: `docs/superpowers/specs/2026-06-20-market-delivery-progress-design.md`

- [ ] **Step 1: Sync final behavior and change history in every `.ai/` file**

Remove planned/future wording and record the final public fields, settlement invariants, compatibility behavior, and test coverage.

- [ ] **Step 2: Run formatting/diff checks**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors and no unrelated files included.

- [ ] **Step 3: Run the full test suite**

```powershell
corepack pnpm@9.12.0 test
```

Expected: exit 0, zero failed tests.

- [ ] **Step 4: Run full lint/type checking**

```powershell
corepack pnpm@9.12.0 lint
```

Expected: exit 0.

- [ ] **Step 5: Run the production web build**

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web build
```

Expected: exit 0 and the `/api/market` route is included in the build output.

- [ ] **Step 6: Review the final diff against the design spec**

Confirm settled impressions, cumulative purchased blocks, exact Stripe metadata, legacy fallback, accessible right-hand progress, all three locales, and unchanged auction behavior.
