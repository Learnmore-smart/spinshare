/**
 * In-memory {@link CampaignRepository} — local/test stand-in for the Firestore
 * `campaigns/{campaignId}` collection.
 *
 * New campaigns always start at `budgetCents = 0` and `status = "active"`
 * (funded later via Stripe). `createdAtMs` is taken from the injected {@link Clock}
 * and the id from the injected {@link IdGenerator} so bidding tie-breaks and ids
 * are deterministic.
 */

import type { Campaign } from "@spinshare/core";
import type {
  CampaignRepository,
  NewCampaign,
} from "../../ports/campaign-repository";
import {
  RandomIdGenerator,
  SystemClock,
  type Clock,
  type IdGenerator,
} from "./clock";

export class MemoryCampaignRepository implements CampaignRepository {
  private readonly campaigns = new Map<string, Campaign>();

  constructor(
    private readonly clock: Clock = new SystemClock(),
    private readonly ids: IdGenerator = new RandomIdGenerator(),
  ) {}

  async listBiddable(): Promise<Campaign[]> {
    return [...this.campaigns.values()].filter(
      (c) => c.budgetCents > 0 && c.cpmCents > 0,
    );
  }

  async getById(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) ?? null;
  }

  async create(input: NewCampaign): Promise<Campaign> {
    const campaign: Campaign = {
      id: this.ids.next("cmp"),
      advertiserId: input.advertiserId,
      ...(input.contactEmail !== undefined
        ? { contactEmail: input.contactEmail }
        : {}),
      adText: input.adText,
      ...(input.destinationUrl !== undefined
        ? { destinationUrl: input.destinationUrl }
        : {}),
      ...(input.brandName !== undefined ? { brandName: input.brandName } : {}),
      ...(input.brandIconDataUrl !== undefined
        ? { brandIconDataUrl: input.brandIconDataUrl }
        : {}),
      publicOnLeaderboard: input.publicOnLeaderboard ?? true,
      cpmCents: input.cpmCents,
      budgetCents: 0,
      status: "active",
      createdAtMs: this.clock.nowMs(),
    };
    this.campaigns.set(campaign.id, campaign);
    return { ...campaign };
  }

  async listByAdvertiser(advertiserId: string): Promise<Campaign[]> {
    return [...this.campaigns.values()].filter(
      (c) => c.advertiserId === advertiserId,
    );
  }

  async applyBudgetDeltaCents(id: string, deltaCents: number): Promise<void> {
    const campaign = this.campaigns.get(id);
    if (!campaign) throw new Error(`campaign not found: ${id}`);
    campaign.budgetCents += deltaCents;
  }

  /** Test/seed helper: inserts a fully-formed campaign. */
  seed(campaign: Campaign): void {
    this.campaigns.set(campaign.id, { ...campaign });
  }
}
