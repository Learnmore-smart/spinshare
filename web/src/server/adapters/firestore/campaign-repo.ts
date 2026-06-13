/**
 * Firestore-backed `CampaignRepository`.
 *
 * Mirrors the `campaigns/{campaignId}` collection. New campaigns start with
 * `budgetCents = 0` and are funded later via Stripe; `applyBudgetDeltaCents`
 * uses an atomic `FieldValue.increment` inside a transaction so concurrent
 * funding/flush writes can never lose updates. See design "Data Models" and
 * the Flush_Process.
 */

import type { Campaign } from "@spinshare/core";
import {
  FieldValue,
  type Firestore,
} from "firebase-admin/firestore";

import type {
  CampaignRepository,
  NewCampaign,
} from "../../ports/campaign-repository";
import { getFirestoreClient } from "./client";
import { COLLECTIONS, toCampaign } from "./collections";

/** Options for {@link FirestoreCampaignRepo}. */
export interface FirestoreCampaignRepoOptions {
  /** Firestore instance; defaults to the shared client. */
  db?: Firestore;
  /** Injected clock (epoch millis) for deterministic `createdAtMs`. */
  now?: () => number;
}

export class FirestoreCampaignRepo implements CampaignRepository {
  private readonly db: Firestore;
  private readonly now: () => number;

  constructor(options: FirestoreCampaignRepoOptions = {}) {
    this.db = options.db ?? getFirestoreClient();
    this.now = options.now ?? (() => Date.now());
  }

  private get collection() {
    return this.db.collection(COLLECTIONS.campaigns);
  }

  /** Candidate set for bidding: `budgetCents > 0` AND `cpmCents > 0`. */
  async listBiddable(): Promise<Campaign[]> {
    // Firestore range filters are limited to one field per query without a
    // composite index, so we gate on budget in the query and apply the
    // `cpmCents > 0` predicate in memory.
    const snap = await this.collection.where("budgetCents", ">", 0).get();
    return snap.docs
      .map((doc) => toCampaign(doc.id, doc.data()))
      .filter((c) => c.cpmCents > 0);
  }

  async getById(id: string): Promise<Campaign | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return toCampaign(doc.id, doc.data() ?? {});
  }

  /** Creates a campaign starting at zero budget. */
  async create(input: NewCampaign): Promise<Campaign> {
    const ref = this.collection.doc();
    const createdAtMs = this.now();
    const campaign: Campaign = {
      id: ref.id,
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
      createdAtMs,
    };
    await ref.set({
      ...campaign,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return campaign;
  }

  async listByAdvertiser(advertiserId: string): Promise<Campaign[]> {
    const snap = await this.collection
      .where("advertiserId", "==", advertiserId)
      .get();
    return snap.docs.map((doc) => toCampaign(doc.id, doc.data()));
  }

  /** Applies a signed budget delta atomically (flush reconciliation + funding). */
  async applyBudgetDeltaCents(id: string, deltaCents: number): Promise<void> {
    const ref = this.collection.doc(id);
    await this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) {
        throw new Error(`Campaign ${id} not found`);
      }
      tx.update(ref, {
        budgetCents: FieldValue.increment(deltaCents),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }
}
