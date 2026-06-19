/**
 * CampaignRepository port — durable campaign storage.
 *
 * Backed by the Firestore emulator locally or production Firestore. Mirrors the
 * `campaigns/{campaignId}` collection. See design "Data Models".
 */

import type { Campaign, CampaignReviewStatus } from "@spinshare/core";

/**
 * Inputs to create a new campaign. New campaigns always start with
 * `budgetCents = 0` (funded later via Stripe). `cpmCents` is validated to
 * 100–100000 ($1.00–$1000.00) and `adText` to 1–60 chars by the core schema.
 */
export interface NewCampaign {
  /** Owner user id. */
  advertiserId: string;
  /** Optional contact email for public checkout-created campaigns. */
  contactEmail?: string;
  /** Ad copy, 1–60 characters. */
  adText: string;
  /** Optional HTTPS destination URL for click-through capable clients. */
  destinationUrl?: string;
  /** Optional public brand name. */
  brandName?: string;
  /** Optional small brand icon data URL. */
  brandIconDataUrl?: string;
  /** False hides this campaign from the public homepage leaderboard. */
  publicOnLeaderboard?: boolean;
  /** Safety review state; defaults to approved when omitted. */
  reviewStatus?: Campaign["reviewStatus"];
  /** Max CPM bid in integer cents (1–100000). */
  cpmCents: number;
}

/**
 * Editable fields for an advertiser-initiated campaign update. Every field is
 * optional; only the keys present are written. `reviewStatus` is included so
 * the route can re-gate a content edit (ad text / destination) through review
 * in the same write.
 */
export interface CampaignUpdate {
  adText?: string;
  destinationUrl?: string;
  brandName?: string;
  brandIconDataUrl?: string;
  publicOnLeaderboard?: boolean;
  cpmCents?: number;
  reviewStatus?: CampaignReviewStatus;
}

/** Durable campaign repository. */
export interface CampaignRepository {
  /** Candidate set for bidding: `budgetCents > 0` AND `cpmCents > 0`. */
  listBiddable(): Promise<Campaign[]>;
  /** Loads a campaign by id, or `null` if it does not exist. */
  getById(id: string): Promise<Campaign | null>;
  /** Creates a campaign starting at zero budget. */
  create(input: NewCampaign): Promise<Campaign>;
  /** Lists all campaigns owned by an advertiser. */
  listByAdvertiser(advertiserId: string): Promise<Campaign[]>;
  /** Applies a signed budget delta (flush reconciliation + funding). */
  applyBudgetDeltaCents(id: string, deltaCents: number): Promise<void>;
  /**
   * Applies an advertiser edit (ad text, destination, brand, leaderboard, CPM,
   * review state). Returns the updated campaign. Throws if the id is unknown.
   */
  update(id: string, patch: CampaignUpdate): Promise<Campaign>;
  /** Permanently removes a campaign. Throws if the id is unknown. */
  delete(id: string): Promise<void>;
  /** Updates safety review state after automated/manual review. */
  updateReviewStatus(id: string, reviewStatus: CampaignReviewStatus): Promise<void>;
}
