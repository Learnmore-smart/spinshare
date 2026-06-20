# Market Delivery Progress Design

**Date:** 2026-06-20

## Goal

Add a right-hand delivery column to the public market leaderboard that shows how many billable impressions each campaign has delivered out of the number purchased, with a compact progress bar and exact counts.

## Product semantics

- **Shown** means a settled, durable impression in `ledgerEntries`. Attempted, rejected, partial-viewability, and duplicate impressions do not count.
- **Purchased** means the cumulative number of 1,000-impression blocks from successful campaign funding checkouts.
- A campaign's purchased total is monotonic. Editing its CPM later must not rewrite historical purchases.
- The public row displays `served / purchased` and a bar whose visual fill is clamped to 0–100%. The numeric label remains the source of truth.

## Considered approaches

### 1. Durable purchased-impression counter — selected

Persist `purchasedImpressions` on each campaign and atomically increment it with the campaign budget whenever funding settles. Carry the exact purchased count through Checkout metadata, webhook parsing, mock settlement, and checkout reconciliation.

This preserves the original block purchase across top-ups and CPM edits and keeps the public market read cheap.

### 2. Infer from remaining budget

Compute `served + floor(remainingBudget / currentCPM)`. This requires no new data but changes historical totals whenever CPM changes and accumulates rounding ambiguity. It is acceptable only as a legacy fallback.

### 3. Aggregate payment history on every refresh

Store purchase details per payment and sum them for every leaderboard request. This is auditable but adds a growing query to a public endpoint that refreshes every 15 seconds. A campaign counter is the appropriate read model; payment records remain the audit trail.

## Data model

Add `Campaign.purchasedImpressions: number`:

- integer;
- non-negative;
- starts at `0` for new campaigns;
- increases by `blockCount * 1_000` only when funding settles;
- never decreases when budget is spent or CPM changes.

Add a dedicated campaign repository operation for funding that updates these values in one campaign-document transaction:

```ts
applyFunding(
  campaignId: string,
  input: { amountCents: number; purchasedImpressions: number },
): Promise<void>
```

`applyBudgetDeltaCents` remains the settlement/reconciliation primitive for spend adjustments. Funding routes must use `applyFunding` so budget and purchased inventory cannot drift within a campaign document.

No new Firestore index is needed because the leaderboard already loads biddable campaigns and reads the counter from those documents.

## Checkout and settlement flow

All campaign checkout entry points already validate a positive integer `blockCount`. They will calculate `purchasedImpressions = blockCount * 1_000` and pass it to the payment gateway.

Stripe Checkout stores the value as string metadata. The Stripe adapter validates and projects it into both webhook events and retrieved checkout-session funding. The mock gateway retains the same value. Settlement paths then call `applyFunding` through the existing pay-then-review seam.

Legacy Stripe sessions can lack this metadata. For those sessions only, settlement derives the count from the verified amount and the campaign's pre-settlement CPM when the amount is an exact multiple. Invalid or non-integral values are rejected rather than inventing inventory.

Payment-event idempotency remains the exactly-once gate. Duplicate webhook deliveries therefore cannot double-increment either budget or purchased impressions.

## Existing campaign compatibility

Seed campaign documents will include `purchasedImpressions = blocks * 1_000`.

For a legacy campaign document without a valid positive counter, the market endpoint uses the best reconstructable total:

```text
served impressions + floor(remaining budget cents * 1000 / current CPM cents)
```

This fallback keeps existing rows meaningful without a risky budget rewrite. New funding writes the durable counter, and newly created campaigns are exact from their first purchase onward. The API never returns a purchased total below the served total.

## Public market API

Each `MarketRow` adds:

```ts
servedImpressions: number;
purchasedImpressions: number;
deliveryPercent: number;
```

`servedImpressions` comes from the existing durable ledger aggregation. `purchasedImpressions` uses the durable counter or legacy fallback. `deliveryPercent` is a finite 0–100 number calculated by the server so all clients use identical semantics.

The fleet summary remains unchanged.

## Leaderboard UI

Add a fourth column, **Delivery**, to the right of bid price.

Each row contains:

1. a tabular numeric label such as `1,284 / 5,000`;
2. a thin full-width track directly below it;
3. a single blue fill using the page's existing market accent;
4. `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and a localized accessible label.

The bar starts at zero and uses no decorative animation, avoiding misleading movement in a frequently refreshed table. Text communicates the exact value, so color is not the sole encoding.

Desktop columns become rank, campaign, bid, and delivery. The table receives a wider minimum width and retains its current horizontal-scroll behavior on narrow screens, preventing the campaign name or exact counts from becoming unreadable.

Add English, Simplified Chinese, and French strings for the column heading and accessible progress description.

## Error and edge handling

- No purchased inventory: return `0%` and `0 / 0`; such campaigns normally do not appear because they are not biddable.
- Served exceeds stored purchased count: preserve the served count and raise the effective denominator to at least served, preventing an impossible API ratio.
- Corrupt counters, non-finite numbers, and negative values: ignore the persisted value and use the legacy fallback.
- Duplicate ledger rows remain impossible by ledger entry idempotency; the existing count method excludes signup bonuses.
- Private or unreviewed campaigns remain excluded exactly as today.

## Testing

- Campaign repository contracts verify funding increments budget and purchased inventory together while spend deltas do not change purchased inventory.
- Payment gateway tests verify purchased impressions survive Stripe metadata projection and mock retrieval.
- Checkout, webhook, and reconciliation tests verify exact block counts and duplicate-event idempotency.
- Market route tests verify per-row counts, percentage clamping, legacy fallback, and private-campaign filtering.
- Seed tests verify `blocks * 1_000` is persisted.
- Homepage render tests verify the delivery heading and accessible progress markup.
- Final verification runs focused tests, workspace tests, lint, and the production web build.

## Non-goals

- Changing auction rank or campaign eligibility.
- Showing attempted or partially viewed impressions.
- Adding a historical delivery chart.
- Backfilling or resetting campaign budgets.
- Exposing advertiser payment amounts in the public API.
