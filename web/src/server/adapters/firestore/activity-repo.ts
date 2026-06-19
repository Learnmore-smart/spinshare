import {
  FieldValue,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";

import type {
  ActivityRepository,
  ActivityRecord,
  AdvertiserActivity,
  AdvertiserActivityStatus,
  DeveloperActivity,
  DeveloperActivityRecord,
  DeveloperActivityStatus,
  ImpressionActivity,
  ImpressionActivityStatus,
} from "../../ports/activity-repository";
import { getFirestoreClient } from "./client";
import { COLLECTIONS } from "./collections";

export interface FirestoreActivityRepoOptions {
  db?: Firestore;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function toActivity(id: string, data: DocumentData): ActivityRecord {
  if (data.type === "advertiser_event") {
    const activity: AdvertiserActivity = {
      activityId: String(data.activityId ?? id),
      campaignId: String(data.campaignId ?? ""),
      type: "advertiser_event",
      status: data.status as AdvertiserActivityStatus,
      createdAtMs: Number(data.createdAtMs ?? 0),
      ...(data.advertiserId !== undefined
        ? { advertiserId: String(data.advertiserId) }
        : {}),
      ...(toNumberOrUndefined(data.amountCents) !== undefined
        ? { amountCents: Number(data.amountCents) }
        : {}),
      ...(toNumberOrUndefined(data.amountMicrocents) !== undefined
        ? { amountMicrocents: Number(data.amountMicrocents) }
        : {}),
      ...(typeof data.amountUsd === "string"
        ? { amountUsd: data.amountUsd }
        : {}),
      ...(typeof data.providerEventId === "string"
        ? { providerEventId: data.providerEventId }
        : {}),
      ...(typeof data.checkoutSessionId === "string"
        ? { checkoutSessionId: data.checkoutSessionId }
        : {}),
    };
    return activity;
  }

  if (data.type === "developer_event") {
    const activity: DeveloperActivity = {
      activityId: String(data.activityId ?? id),
      campaignId: "payout",
      type: "developer_event",
      status: data.status as DeveloperActivityStatus,
      createdAtMs: Number(data.createdAtMs ?? 0),
      developerId: String(data.developerId ?? ""),
      ...(toNumberOrUndefined(data.amountCents) !== undefined
        ? { amountCents: Number(data.amountCents) }
        : {}),
      ...(typeof data.amountUsd === "string"
        ? { amountUsd: data.amountUsd }
        : {}),
      ...(typeof data.providerEventId === "string"
        ? { providerEventId: data.providerEventId }
        : {}),
      ...(toNumberOrUndefined(data.providerStatus) !== undefined
        ? { providerStatus: Number(data.providerStatus) }
        : {}),
      ...(typeof data.providerCode === "string"
        ? { providerCode: data.providerCode }
        : {}),
    };
    return activity;
  }

  return {
    activityId: String(data.activityId ?? id),
    campaignId: String(data.campaignId ?? ""),
    status: data.status as ImpressionActivityStatus,
    viewDurationMs: Number(data.viewDurationMs ?? 0),
    createdAtMs: Number(data.createdAtMs ?? 0),
    ...(data.advertiserId !== undefined
      ? { advertiserId: String(data.advertiserId) }
      : {}),
    ...(data.developerId !== undefined
      ? { developerId: String(data.developerId) }
      : {}),
    ...(toNumberOrUndefined(data.revenueMicrocents) !== undefined
      ? { revenueMicrocents: Number(data.revenueMicrocents) }
      : {}),
    ...(toNumberOrUndefined(data.developerCreditCents) !== undefined
      ? { developerCreditCents: Number(data.developerCreditCents) }
      : {}),
    ...(typeof data.ipHash === "string" ? { ipHash: data.ipHash } : {}),
    ...(typeof data.uaHash === "string" ? { uaHash: data.uaHash } : {}),
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export class FirestoreActivityRepo implements ActivityRepository {
  private readonly db: Firestore;

  constructor(options: FirestoreActivityRepoOptions = {}) {
    this.db = options.db ?? getFirestoreClient();
  }

  private get collection() {
    return this.db.collection(COLLECTIONS.impressionActivities);
  }

  async record(activity: ActivityRecord): Promise<void> {
    const ref = this.collection.doc(activity.activityId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        return;
      }
      tx.set(ref, {
        ...activity,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  }

  async listByDeveloper(
    developerId: string,
  ): Promise<DeveloperActivityRecord[]> {
    const snap = await this.collection
      .where("developerId", "==", developerId)
      .get();
    return snap.docs
      .map((doc) => toActivity(doc.id, doc.data()))
      .filter(
        (activity): activity is DeveloperActivityRecord =>
          activity.type !== "advertiser_event",
      )
      .sort((a, b) => a.createdAtMs - b.createdAtMs);
  }

  async listByCampaignIds(campaignIds: string[]): Promise<ActivityRecord[]> {
    if (campaignIds.length === 0) {
      return [];
    }

    const uniqueCampaignIds = [...new Set(campaignIds)];
    const docs: DocumentReference[] = [];
    const activities: ActivityRecord[] = [];

    for (const ids of chunk(uniqueCampaignIds, 30)) {
      const snap = await this.collection.where("campaignId", "in", ids).get();
      for (const doc of snap.docs) {
        if (!docs.some((seen) => seen.path === doc.ref.path)) {
          docs.push(doc.ref);
          activities.push(toActivity(doc.id, doc.data()));
        }
      }
    }

    return activities.sort((a, b) => a.createdAtMs - b.createdAtMs);
  }

  async listByCheckoutSessionId(
    sessionId: string,
  ): Promise<AdvertiserActivity[]> {
    const snap = await this.collection
      .where("checkoutSessionId", "==", sessionId)
      .get();
    return snap.docs
      .map((doc) => toActivity(doc.id, doc.data()))
      .filter(
        (activity): activity is AdvertiserActivity =>
          activity.type === "advertiser_event",
      )
      .sort((a, b) => a.createdAtMs - b.createdAtMs);
  }
}
