# Welcome Gift Earnings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the existing one-time $1 signup bonus as a localized `+$1.00` welcome-gift row in Recent credit and as the first point in the earnings curve.

**Architecture:** Preserve the signup-bonus ledger entry as the only durable source. Classify ledger presentation rows, adapt the bonus row into one pinned `welcome_gift` activity source, merge it through the existing activity normalizer/de-duplication path, and render the chart whenever the selected ledger-derived series is non-empty.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Vitest, Recharts, existing SpinShare ledger and i18n helpers.

---

## File Map

- Modify `web/src/app/dashboard/developer/summarize-ledger.ts`: preserve normalized ledger row type for downstream adapters.
- Modify `web/src/app/dashboard/developer/summarize-ledger.test.ts`: prove signup bonuses remain excluded from impressions while retaining chart/activity metadata.
- Create `web/src/app/dashboard/developer/welcome-gift-activity.ts`: pure adapter from a signup-bonus ledger row to an activity source.
- Create `web/src/app/dashboard/developer/welcome-gift-activity.test.ts`: cover adapter output and missing-timestamp behavior.
- Modify `web/src/app/dashboard/activity-feed.ts`: normalize `welcome_gift`, localize its event, and format a positive signed amount.
- Modify `web/src/app/dashboard/activity-feed.test.ts`: cover localized labels and `+$1.00`.
- Modify `web/src/lib/i18n/types.ts`: require typed welcome-gift event copy.
- Modify `web/src/lib/i18n/extra-dictionaries.ts`: provide English, Chinese, and French welcome-gift labels.
- Modify `web/src/app/dashboard/developer/developer-activity-context.tsx`: merge pinned ledger-derived activity into the initial API page.
- Modify `web/src/app/dashboard/developer/developer-activity-context.test.ts`: prove stable-id de-duplication and localization.
- Modify `web/src/app/dashboard/developer/layout.tsx`: derive and pass the pinned welcome-gift activity.
- Modify `web/src/app/dashboard/developer/layout.test.tsx`: prove layout wiring from ledger to activity provider.
- Modify `web/src/app/dashboard/developer/developer-earnings-view.tsx`: use selected chart-series emptiness instead of impression count.
- Create `web/src/app/dashboard/developer/developer-earnings-view.test.tsx`: render a bonus-only earnings chart.
- Modify `web/src/app/dashboard/developer/developer-activity-view.test.tsx`: cover localized search and CSV output.
- Update matching `.ai/.../*.md` mirror documents before each code edit and synchronize them after implementation.

### Task 1: Preserve Signup-Bonus Ledger Identity

**Files:**
- Modify: `web/src/app/dashboard/developer/summarize-ledger.ts`
- Modify: `web/src/app/dashboard/developer/summarize-ledger.test.ts`

- [ ] **Step 1: Write the failing ledger classification test**

Add a signup-bonus fixture to `summarize-ledger.test.ts` and assert:

```ts
it("keeps signup-bonus metadata for chart and activity presentation", () => {
  const createdAtMs = Date.now();
  const summary = summarizeLedger([
    entry({
      entryId: "signup_bonus:dev1",
      type: "signup_bonus",
      campaignId: "",
      revenueMicrocents: 0,
      developerCreditCents: 100,
      creditCents: 100,
      createdAtMs,
    }),
  ]);

  expect(summary.impressionCount).toBe(0);
  expect(summary.rows[0]).toMatchObject({
    entryId: "signup_bonus:dev1",
    ledgerType: "signup_bonus",
    developerCreditCents: 100,
    developerCreditUsd: "1.00",
    createdAtMs,
  });
  expect(summary.series[0]?.cumulativeUsd).toBe(1);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/summarize-ledger.test.ts
```

Expected: FAIL because `LedgerActivityRow` does not expose `ledgerType`.

- [ ] **Step 3: Add normalized ledger type**

In `summarize-ledger.ts`, add `type LedgerEntryType` beside the existing
`type LedgerEntry` import, insert `ledgerType: LedgerEntryType` after
`entryId: string` in `LedgerActivityRow`, and normalize legacy rows:

```ts
function ledgerEntryType(entry: LedgerEntry): LedgerEntryType {
  return entry.type === "signup_bonus" || entry.entryId.startsWith("signup_bonus:")
    ? "signup_bonus"
    : "impression";
}
```

At the start of the `entries.forEach()` callback, assign
`const rowType = ledgerEntryType(entry)`. Use `rowType === "signup_bonus"` for
`hasSignupBonus` detection and add `ledgerType: rowType` to the object pushed
into `rows`.

- [ ] **Step 4: Run the ledger test and verify GREEN**

Run the Step 2 command.

Expected: PASS.

- [ ] **Step 5: Commit the classified ledger row**

```powershell
git add -- web/src/app/dashboard/developer/summarize-ledger.ts web/src/app/dashboard/developer/summarize-ledger.test.ts .ai/web/src/app/dashboard/developer/summarize-ledger.md .ai/web/src/app/dashboard/developer/summarize-ledger.test.md
git commit -m "feat: classify welcome gift ledger rows"
```

### Task 2: Normalize and Localize Welcome-Gift Activity

**Files:**
- Modify: `web/src/app/dashboard/activity-feed.ts`
- Modify: `web/src/app/dashboard/activity-feed.test.ts`
- Modify: `web/src/lib/i18n/types.ts`
- Modify: `web/src/lib/i18n/extra-dictionaries.ts`

- [ ] **Step 1: Write the failing activity normalization test**

Add to `activity-feed.test.ts`:

```ts
it("formats a localized welcome gift as positive credit", () => {
  const copy: ActivityFeedCopy = {
    ...defaultActivityFeedCopy,
    eventLabels: {
      ...defaultActivityFeedCopy.eventLabels,
      welcomeGift: "欢迎礼金",
    },
  };
  const [row] = toActivityFeedRows([
    {
      activityId: "signup_bonus:dev1",
      campaignId: "—",
      type: "welcome_gift",
      status: "credited",
      amountCents: 100,
      amountUsd: "1.00",
      createdAtMs: 1234,
    },
  ], copy);

  expect(row).toMatchObject({
    type: "welcome_gift",
    statusLabel: "Credited",
    durationLabel: "欢迎礼金",
    creditLabel: "+$1.00",
    counted: true,
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts
```

Expected: FAIL because `welcome_gift` and `eventLabels.welcomeGift` are not defined and positive signing is absent.

- [ ] **Step 3: Implement the activity type and formatter**

In `activity-feed.ts`:

```ts
export type ActivityFeedType =
  | "impression_attempt"
  | "advertiser_event"
  | "developer_event"
  | "welcome_gift";
```

Insert `welcomeGift: string` in `ActivityFeedCopy.eventLabels`, and add
`welcomeGift: "Welcome gift"` to `defaultActivityFeedCopy.eventLabels`.
Treat `welcome_gift` as a money event in `activityCreditLabel()`, prefix its formatted non-negative amount with `+`, return `copy.eventLabels.welcomeGift` from `activityDurationLabel()`, and treat it as an event in `activityDetailItems()`.

The signed amount branch must preserve all supported amount representations:

```ts
function signedActivityAmount(activity: ActivityFeedSource): string {
  const amount = activity.amountUsd !== undefined
    ? `$${activity.amountUsd}`
    : activity.amountCents !== undefined
      ? `$${formatCentsAsUsd(activity.amountCents)}`
      : activity.amountMicrocents !== undefined
        ? formatMicrocentsAsUsd(activity.amountMicrocents)
        : "$0.00";
  return activity.type === "welcome_gift" && !amount.startsWith("-")
    ? `+${amount}`
    : amount;
}
```

- [ ] **Step 4: Add typed locale coverage**

Add `welcomeGift: string` to `Dictionary.activityFeed.eventLabels` in `types.ts`, then add these exact values to `extra-dictionaries.ts`:

```ts
// en
welcomeGift: "Welcome gift",
// zh
welcomeGift: "欢迎礼金",
// fr
welcomeGift: "Cadeau de bienvenue",
```

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts
corepack pnpm@9.12.0 --filter @spinshare/web lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- web/src/app/dashboard/activity-feed.ts web/src/app/dashboard/activity-feed.test.ts web/src/lib/i18n/types.ts web/src/lib/i18n/extra-dictionaries.ts .ai/web/src/app/dashboard/activity-feed.md .ai/web/src/lib/i18n/types.md .ai/web/src/lib/i18n/extra-dictionaries.md
git commit -m "feat: localize welcome gift activity"
```

### Task 3: Merge the Pinned Gift into Recent Credit

**Files:**
- Create: `web/src/app/dashboard/developer/welcome-gift-activity.ts`
- Create: `web/src/app/dashboard/developer/welcome-gift-activity.test.ts`
- Modify: `web/src/app/dashboard/developer/developer-activity-context.tsx`
- Modify: `web/src/app/dashboard/developer/developer-activity-context.test.ts`
- Modify: `web/src/app/dashboard/developer/layout.tsx`
- Modify: `web/src/app/dashboard/developer/layout.test.tsx`

- [ ] **Step 1: Write the failing welcome-gift adapter tests**

Create `welcome-gift-activity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { LedgerActivityRow } from "./summarize-ledger";
import { welcomeGiftActivityFromRows } from "./welcome-gift-activity";

function bonusRow(createdAtMs?: number): LedgerActivityRow {
  return {
    entryId: "signup_bonus:dev1",
    ledgerType: "signup_bonus",
    sequence: 1,
    campaignId: "",
    developerCreditCents: 100,
    developerCreditUsd: "1.00",
    developerCreditDisplayMicrocents: 100_000,
    developerCreditDisplayUsd: "1.00",
    ...(createdAtMs === undefined ? {} : { createdAtMs }),
  };
}

describe("welcomeGiftActivityFromRows", () => {
  it("adapts the durable bonus row into one pinned activity source", () => {
    expect(welcomeGiftActivityFromRows([bonusRow(1234)])).toEqual({
      activityId: "signup_bonus:dev1",
      campaignId: "—",
      type: "welcome_gift",
      status: "credited",
      amountCents: 100,
      amountUsd: "1.00",
      createdAtMs: 1234,
    });
  });

  it("does not fabricate a timestamp for a legacy bonus row", () => {
    expect(welcomeGiftActivityFromRows([bonusRow()])).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the adapter test and verify RED**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/welcome-gift-activity.test.ts
```

Expected: FAIL because `welcome-gift-activity.ts` does not exist.

- [ ] **Step 3: Implement the pure adapter**

Create `welcome-gift-activity.ts`:

```ts
import type { ActivityFeedSource } from "../activity-feed";
import type { LedgerActivityRow } from "./summarize-ledger";

export function welcomeGiftActivityFromRows(
  rows: readonly LedgerActivityRow[],
): ActivityFeedSource | undefined {
  const bonus = rows.find((row) => row.ledgerType === "signup_bonus");
  if (bonus?.createdAtMs === undefined) return undefined;
  return {
    activityId: bonus.entryId,
    campaignId: "—",
    type: "welcome_gift",
    status: "credited",
    amountCents: bonus.developerCreditCents,
    amountUsd: bonus.developerCreditUsd,
    createdAtMs: bonus.createdAtMs,
  };
}
```

- [ ] **Step 4: Run the adapter test and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Write the failing initial-merge test**

Import `mergeInitialDeveloperActivityRows` from
`developer-activity-context.tsx`, then add:

```ts
it("keeps one localized welcome gift when the stable id appears twice", () => {
  const gift = {
    activityId: "signup_bonus:dev1",
    campaignId: "—",
    type: "welcome_gift" as const,
    status: "credited" as const,
    amountCents: 100,
    amountUsd: "1.00",
    createdAtMs: 1500,
  };
  const copy: ActivityFeedCopy = {
    ...defaultActivityFeedCopy,
    eventLabels: {
      ...defaultActivityFeedCopy.eventLabels,
      welcomeGift: "欢迎礼金",
    },
  };

  const merged = mergeInitialDeveloperActivityRows([gift], [gift], copy);
  expect(merged).toHaveLength(1);
  expect(merged[0]).toMatchObject({
    activityId: "signup_bonus:dev1",
    durationLabel: "欢迎礼金",
    creditLabel: "+$1.00",
  });
});
```

- [ ] **Step 6: Run the merge test and verify RED**

Run the context test. Expected: FAIL because
`mergeInitialDeveloperActivityRows` does not exist.

- [ ] **Step 7: Accept and merge pinned sources on initial load**

Add the pure initial-merge helper:

```ts
export function mergeInitialDeveloperActivityRows(
  pinned: readonly ActivityFeedSource[],
  fetched: readonly ActivityFeedSource[],
  copy: ActivityFeedCopy = defaultActivityFeedCopy,
): ActivityFeedRow[] {
  return mergeDeveloperActivityRows([], [...pinned, ...fetched], copy);
}
```

Change the provider signature and successful initial-load assignment:

```tsx
export function DeveloperActivityProviderClient({
  token,
  pinnedActivities = [],
  children,
}: {
  token: string;
  pinnedActivities?: readonly ActivityFeedSource[];
  children: ReactNode;
}) {
  // ...
  setActivityState({
    status: "ready",
    activities: mergeInitialDeveloperActivityRows(
      pinnedActivities,
      body.activities,
      t.activityFeed,
    ),
    ...(body.nextCursor !== undefined ? { nextCursor: body.nextCursor } : {}),
  });
  // include pinnedActivities in loadActivity dependencies
}
```

Load-more already merges against `current.activities`, so the pinned gift remains present and stable-id de-duplicated.

- [ ] **Step 8: Write the failing layout wiring test**

Update the mocked provider in `layout.test.tsx` to retain `pinnedActivities`, return a signup-bonus ledger entry from `listByDeveloper`, render the layout, and assert:

```ts
const activityProvider = element.props.children;
expect(activityProvider.props.pinnedActivities).toEqual([
  {
    activityId: "signup_bonus:dev_123",
    campaignId: "—",
    type: "welcome_gift",
    status: "credited",
    amountCents: 100,
    amountUsd: "1.00",
    createdAtMs: 1234,
  },
]);
```

- [ ] **Step 9: Run the layout test and verify RED**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/layout.test.tsx
```

Expected: FAIL because the layout does not pass `pinnedActivities`.

- [ ] **Step 10: Wire the layout to the adapter**

In `layout.tsx`:

```tsx
import { welcomeGiftActivityFromRows } from "./welcome-gift-activity";

const welcomeGiftActivity = welcomeGiftActivityFromRows(summary.rows);

<DeveloperActivityProviderClient
  token={token}
  pinnedActivities={welcomeGiftActivity ? [welcomeGiftActivity] : []}
>
```

Only replace the provider's opening tag with the three lines above.

- [ ] **Step 11: Run focused tests and commit**

Run the context and layout tests. Expected: PASS.

```powershell
git add -- web/src/app/dashboard/developer/welcome-gift-activity.ts web/src/app/dashboard/developer/welcome-gift-activity.test.ts web/src/app/dashboard/developer/developer-activity-context.tsx web/src/app/dashboard/developer/developer-activity-context.test.ts web/src/app/dashboard/developer/layout.tsx web/src/app/dashboard/developer/layout.test.tsx .ai/web/src/app/dashboard/developer
git commit -m "feat: include welcome gift in recent credit"
```

### Task 4: Render the Bonus-Only Earnings Curve

**Files:**
- Modify: `web/src/app/dashboard/developer/developer-earnings-view.tsx`
- Create: `web/src/app/dashboard/developer/developer-earnings-view.test.tsx`

- [ ] **Step 1: Write the failing render test**

Create a server-render test that mocks `useDeveloperDashboard()` with `impressionCount: 0` and one signup-bonus ledger row, mocks `EarningsChart` as a test marker, renders `DeveloperEarningsView`, and asserts:

```ts
expect(html).toContain('data-testid="earnings-chart"');
expect(html).not.toContain('data-testid="empty-state"');
expect(html).toContain("1");
```

The mocked summary row must have `ledgerType: "signup_bonus"`, 100 cents, 100,000 display microcents, and a current `createdAtMs` so it falls inside the default 7-day range.

- [ ] **Step 2: Run the render test and verify RED**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/developer-earnings-view.test.tsx
```

Expected: FAIL because `impressionCount === 0` renders the empty state.

- [ ] **Step 3: Render based on the selected series**

In `developer-earnings-view.tsx`, stop destructuring `impressionCount` and make
this exact condition replacement:

```tsx
// before
{impressionCount === 0 ? (

// after
{chartSeries.length === 0 ? (
```

- [ ] **Step 4: Run focused tests and commit**

Run the new render test and `summarize-ledger.test.ts`. Expected: PASS.

```powershell
git add -- web/src/app/dashboard/developer/developer-earnings-view.tsx web/src/app/dashboard/developer/developer-earnings-view.test.tsx .ai/web/src/app/dashboard/developer
git commit -m "fix: show welcome gift on earnings curve"
```

### Task 5: Verify Search, CSV, and Full Regression

**Files:**
- Modify: `web/src/app/dashboard/developer/developer-activity-view.test.tsx`
- Update: all touched `.ai` mirror files with implemented behavior and verification results.

- [ ] **Step 1: Add the welcome-gift search and CSV regression test**

Normalize a Chinese welcome-gift source with `toActivityFeedRows()`, then assert:

```ts
const [gift] = toActivityFeedRows([{
  activityId: "signup_bonus:dev1",
  campaignId: "—",
  type: "welcome_gift",
  status: "credited",
  amountCents: 100,
  amountUsd: "1.00",
  createdAtMs: 1234,
}], {
  ...defaultActivityFeedCopy,
  eventLabels: {
    ...defaultActivityFeedCopy.eventLabels,
    welcomeGift: "欢迎礼金",
  },
});

expect(filterDeveloperActivityRows([gift!], "欢迎礼金")).toEqual([gift]);
expect(developerActivityRowsToCsv([gift!])).toContain(
  "signup_bonus:dev1,—,Credited,欢迎礼金,+$1.00,1234",
);
```

- [ ] **Step 2: Run all focused tests**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/developer/summarize-ledger.test.ts src/app/dashboard/developer/welcome-gift-activity.test.ts src/app/dashboard/developer/developer-activity-context.test.ts src/app/dashboard/developer/layout.test.tsx src/app/dashboard/developer/developer-earnings-view.test.tsx src/app/dashboard/developer/developer-activity-view.test.tsx
```

Expected: all focused tests PASS.

- [ ] **Step 3: Run full web validation**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test
corepack pnpm@9.12.0 --filter @spinshare/web lint
```

Expected: full web suite and TypeScript typecheck PASS without new warnings.

- [ ] **Step 4: Review the final diff**

Run:

```powershell
git diff --check
git status --short
git diff -- web/src/app/dashboard web/src/lib/i18n .ai/web/src/app/dashboard .ai/web/src/lib/i18n
```

Confirm that unrelated existing changes in `web/src/app/page.tsx`, `web/src/lib/spinshare-install-command.ts`, and `.claude/` remain untouched.

- [ ] **Step 5: Commit final regression coverage and documentation**

```powershell
git add -- web/src/app/dashboard/developer/developer-activity-view.test.tsx .ai/web/src/app/dashboard .ai/web/src/lib/i18n
git commit -m "test: cover welcome gift earnings visibility"
```
