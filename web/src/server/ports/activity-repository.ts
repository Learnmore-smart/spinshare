export type ImpressionActivityStatus =
  | "tooShort"
  | "invalidToken"
  | "invalidCampaign"
  | "credited"
  | "shadowBanned"
  | "earningCapped"
  | "duplicate";

export interface ImpressionActivity {
  activityId: string;
  campaignId: string;
  type?: "impression_attempt";
  status: ImpressionActivityStatus;
  viewDurationMs: number;
  createdAtMs: number;
  advertiserId?: string;
  developerId?: string;
  revenueMicrocents?: number;
  developerCreditCents?: number;
}

export type AdvertiserActivityStatus =
  | "checkoutStarted"
  | "budgetFunded"
  | "budgetDebited";

export interface AdvertiserActivity {
  activityId: string;
  campaignId: string;
  type: "advertiser_event";
  status: AdvertiserActivityStatus;
  createdAtMs: number;
  advertiserId?: string;
  amountCents?: number;
  amountMicrocents?: number;
  amountUsd?: string;
  providerEventId?: string;
  checkoutSessionId?: string;
}

export type ActivityRecord = ImpressionActivity | AdvertiserActivity;

export interface ActivityRepository {
  record(activity: ActivityRecord): Promise<void>;
  listByDeveloper(developerId: string): Promise<ImpressionActivity[]>;
  listByCampaignIds(campaignIds: string[]): Promise<ActivityRecord[]>;
}
