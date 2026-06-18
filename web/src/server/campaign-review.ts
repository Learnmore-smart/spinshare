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

import { reviewAdTextSafety, type CampaignReviewStatus } from "@spinshare/core";

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
