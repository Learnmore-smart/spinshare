# seed-ad-market.mjs

## Purpose

Upserts the **initial 6-campaign ad market** into **production** Firestore so the
live bidding pool (`GET /api/ad` / `listBiddable`) has real inventory. Idempotent:
each campaign uses a deterministic `cmp-seed-*` doc id, so re-running updates in
place rather than duplicating.

## Money model

- 1 Block = 1000 impressions.
- `cpmCents` = Price-per-Block × 100.
- `budgetCents` = `cpmCents` × Blocks bought.

The script asserts `budgetCents === cpmCents * blocks` for every campaign before
writing, so a typo in the table fails fast instead of seeding bad money.

## Campaigns

| Doc id | brandName | adText | destinationUrl | cpmCents | Blocks | budgetCents |
|---|---|---|---|---|---|---|
| `cmp-seed-cursor` | Cursor | Cursor — The best way to code with AI | https://cursor.com/ | 1120 | 5 | 5600 |
| `cmp-seed-learnx` | LearnX | LearnX — Know exactly what to study | https://learnx.pro/ | 560 | 10 | 5600 |
| `cmp-seed-trae` | Trae | Trae — The Real AI Engineer | https://www.trae.ai/ | 1000 | 4 | 4000 |
| `cmp-seed-antigravity` | Antigravity | Antigravity — Experience Liftoff | https://antigravity.google/ | 850 | 5 | 4250 |
| `cmp-seed-glm` | GLM | GLM — Built for Long-Horizon Tasks | https://z.ai/ | 880 | 6 | 5280 |
| `cmp-seed-spinshare` | SpinShare | SpinShare — Get paid when your AI thinks | https://spinshare-web-vert.vercel.app/ | 600 | 10 | 6000 |

Every campaign is written with `status: "active"`, `reviewStatus: "approved"`,
and `publicOnLeaderboard: true` so it is immediately biddable and shown on the
public market leaderboard.

## Implemented Change 2026-06-20 Purchased Inventory

Persist `purchasedImpressions: blocks * 1,000` on every deterministic seed
campaign. This initializes the durable public delivery denominator without
deriving it from a mutable CPM or remaining budget.

## Usage

This writes to **production** top-level `campaigns/`. Because repo `.env` keeps
`SPINSHARE_FIRESTORE_NAMESPACE="test"` for localhost cloud-Firestore testing, the
script refuses to run while a namespace is set unless `--production` is passed —
the same guard `delete-prod-learnx-campaign.mjs` uses. This prevents accidentally
seeding the local `test` namespace (or, worse, seeding prod when you meant test).

```bash
# Preview the exact docs without touching Firestore:
node web/scripts/seed-ad-market.mjs --dry-run

# Write to production (required because .env sets a namespace):
node web/scripts/seed-ad-market.mjs --production
```

Requires `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and
`FIREBASE_PRIVATE_KEY` in repo-root `.env`.

## Notes

- Budget is written to the Firestore doc (`budgetCents`), which is the source of
  truth `listBiddable()` filters on (`budgetCents > 0` AND `cpmCents > 0` AND
  `status === "active"` AND `reviewStatus === "approved"`). The RTDB hot-budget
  mirror (`spinshare/hot/bud/*`) is reconciled by the flush process; this seed
  does not pre-write it, matching `seed-learnx-campaign.mjs`.
- `advertiserId` values are synthetic house ids (`seed-<brand>-advertiser`); they
  do not need a backing `users/` doc for serving.
- `cpmCents` are all within the core schema's 100–100000 range and `adText` within
  1–60 chars, so they pass campaign validation.

## Changelog

| Date | Change |
|---|---|
| 2026-06-20 | Implemented durable purchased-impression inventory for seed campaigns |
| 2026-06-20 | Updated Trae ("The Real AI Engineer") and Antigravity ("Experience Liftoff") slogans |
| 2026-06-20 | Revised slogans/CPMs/blocks (LearnX→10 blocks @ $5.60; Trae $10; GLM $8.80; Antigravity prefix-trimmed); added `--delete` mode |
| 2026-06-20 | Created script + doc + test for initial 6-campaign production ad-market seed |
