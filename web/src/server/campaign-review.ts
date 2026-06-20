/**
 * Campaign content review seam.
 *
 * Advertisers pay first, then their ad content (text + destination link) is
 * reviewed before it can bid. Today the only gate is the synchronous keyword
 * screen baked into `adTextSchema` (`reviewAdTextSafety` in `@spinshare/core`),
 * which already rejects clearly-unsafe copy at validation time. This module is
 * the seam where a richer asynchronous classifier (e.g. DeepSeek/NSFW model)
 * will plug in later: it returns a `CampaignReviewStatus` so callers can store
 * `pending` / `approved` / `rejected` on the campaign and the dashboard can show
 * an "under review" or "rejected — edit to resubmit" state.
 *
 * For now it approves any content that already passed schema validation. Keep
 * the signature stable so swapping in a real model is a one-file change.
 */

import {
  reviewAdTextSafety,
  type Campaign,
  type CampaignReviewStatus,
} from "@spinshare/core";

import type { CampaignRepository } from "./ports/campaign-repository";

/** Inputs the reviewer inspects. */
export interface CampaignReviewInput {
  adText: string;
  destinationUrl?: string;
}

/** Outcome of a content review. `reason` is set when rejected. */
export interface CampaignReviewResult {
  status: CampaignReviewStatus;
  reason?: string;
}

/** Exact inventory and money carried by one settled campaign funding. */
export interface CampaignFundingInput {
  amountCents: number;
  purchasedImpressions: number;
}

/**
 * Resolves exact purchased inventory, preserving a strict fallback for Stripe
 * Checkout Sessions created before inventory metadata was introduced.
 */
export function resolvePurchasedImpressions(
  explicit: number | undefined,
  amountCents: number,
  cpmCents: number,
): number | null {
  if (Number.isSafeInteger(explicit) && explicit !== undefined && explicit > 0) {
    return explicit;
  }
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    !Number.isSafeInteger(cpmCents) ||
    cpmCents <= 0 ||
    amountCents % cpmCents !== 0
  ) {
    return null;
  }
  const inferred = (amountCents / cpmCents) * 1_000;
  return Number.isSafeInteger(inferred) && inferred > 0 ? inferred : null;
}

/**
 * Reviews campaign content and returns the review status to persist.
 *
 * TODO(nsfw): replace the synchronous keyword screen with the real classifier
 * (DeepSeek/NSFW model). When it becomes async, callers already `await` this.
 */
export async function reviewCampaignContent(
  input: CampaignReviewInput,
): Promise<CampaignReviewResult> {
  const adTextReview = reviewAdTextSafety(input.adText);
  if (!adTextReview.safe) {
    return { status: "rejected", reason: adTextReview.reason };
  }
  return { status: "approved" };
}

/**
 * Credits a campaign's budget and applies the **pay-then-review** gate.
 *
 * The advertiser pays first; only then is the ad reviewed before it can bid.
 * On a campaign's FIRST funding (budget transitioning from 0 → >0) we park it in
 * `pending` — which `listBiddable` excludes, so an unreviewed ad can never serve
 * — run content review, then persist the outcome (`approved` / `rejected`).
 * Top-ups of an already-funded campaign skip re-review so a live, approved
 * campaign is never knocked offline by adding more budget; a rejected campaign
 * is re-reviewed only after the advertiser edits it (see `PATCH /api/campaigns`).
 *
 * `campaign` must be the pre-credit snapshot (its `budgetCents` is read to detect
 * the first-funding transition). Returns the campaign's review status afterwards.
 */
export async function creditCampaignBudgetWithReview(
  campaigns: CampaignRepository,
  campaign: Campaign,
  funding: CampaignFundingInput,
): Promise<CampaignReviewStatus> {
  const wasUnfunded = campaign.budgetCents <= 0;
  await campaigns.applyFunding(campaign.id, funding);
  if (!wasUnfunded) {
    return campaign.reviewStatus ?? "approved";
  }
  await campaigns.update(campaign.id, { reviewStatus: "pending" });
  const review = await reviewCampaignContent({
    adText: campaign.adText,
    destinationUrl: campaign.destinationUrl,
  });
  await campaigns.update(campaign.id, { reviewStatus: review.status });
  return review.status;
}
