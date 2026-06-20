# campaign-review.ts

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose（一句话人话）

广告内容审核的"接缝"：广告主付费后/编辑后，检查广告文案+落地链接是否安全（NSFW 等），返回 `pending|approved|rejected`，未来在这里接入 DeepSeek。

## What It Does

- Exposes `reviewCampaignContent({ adText, destinationUrl })` returning a
  `CampaignReviewResult` (`status`, optional `reason`).
- Today it delegates to the synchronous keyword screen `reviewAdTextSafety`
  (from `@spinshare/core`, also baked into `adTextSchema`): unsafe text →
  `rejected`, otherwise `approved`.
- It is the single place a richer async classifier (DeepSeek/NSFW model) plugs
  in later — callers already `await` it.

## Public API

| Name | Type | Description |
|------|------|-------------|
| reviewCampaignContent | async fn | Review ad content → review status to persist |
| creditCampaignBudgetWithReview | async fn | Apply a budget credit + pay-then-review gate (first funding → pending → review → approved/rejected; top-ups skip re-review) |
| CampaignReviewInput | interface | `{ adText, destinationUrl? }` |
| CampaignReviewResult | interface | `{ status, reason? }` |

## Pay-then-review flow

`creditCampaignBudgetWithReview(campaigns, campaign, amountCents)` is the single
funding entry point used by all four credit sites — `POST /api/campaigns`
(direct checkout), `POST /api/funds/checkout`, the Stripe webhook, and
checkout-reconciliation. On a campaign's FIRST funding (budget 0 → >0) it parks
the campaign in `pending` (excluded by `listBiddable`), runs review, then
persists `approved`/`rejected`. Top-ups of an already-funded campaign skip
re-review. `campaign` must be the pre-credit snapshot.

## Dependencies

- **Internal:** `@spinshare/core` — `reviewAdTextSafety`, `CampaignReviewStatus`.

## Agent Decisions / Thoughts

- **2026-06-18 Claude:** Built as a thin seam, not a real classifier — the user
  explicitly deferred the actual NSFW filter ("maybe deepseek later"). Called
  from `PATCH /api/campaigns` on content edits to re-gate (the "edit → resubmit"
  half of pay-then-review). NOT yet wired into create/fund (would flip funded
  campaigns to `pending` and break bidding/tests); that's the future
  pay-then-review step. See memory `nsfw-review-and-cpm-flow`.

## Important Notes / NEVER Change

- Keep the signature stable (`async`, returns `CampaignReviewStatus`) so swapping
  in the real model is a one-file change.
- Only `approved` + `budgetCents>0` + `cpmCents>0` campaigns bid (see
  `listBiddable`); rejected/pending must never serve.

## Planned Change 2026-06-20 Funding Inventory

Change the pay-then-review funding input from a raw amount to
`{ amountCents, purchasedImpressions }` and call `CampaignRepository.applyFunding`.
Add one strict legacy resolver: trust valid provider metadata; otherwise infer
only when verified amount is an exact whole-block multiple of campaign CPM.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned exact purchased-inventory funding and legacy resolution. | Codex |
| 2026-06-18 | Created — content-review seam for edit re-gating | Claude |
