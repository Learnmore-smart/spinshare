/**
 * CampaignRepository port — durable campaign storage.
 *
 * Backed by the Firestore emulator locally or production Firestore. Mirrors the
 * `campaigns/{campaignId}` collection. See design "Data Models".
 */

import type { Campaign } from "@spinshare/core";

/**
 * Inputs to create a new campaign. New campaigns always start with
 * `budgetCents = 0` (funded later via Stripe). `cpmCents` is validated to
 * 1–100000 ($0.01–$1000.00) and `adText` to 1–60 chars by the core schema.
 */
export interface NewCampaign {
  /** Owner user id. */
  advertiserId: string;
  /** Ad copy, 1–60 characters. */
  adText: string;
  /** Max CPM bid in integer cents (1–100000). */
  cpmCents: number;
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
}
