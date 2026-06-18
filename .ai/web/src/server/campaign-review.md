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
| CampaignReviewInput | interface | `{ adText, destinationUrl? }` |
| CampaignReviewResult | interface | `{ status, reason? }` |

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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Created — content-review seam for edit re-gating | Claude |
