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

export type DeveloperActivityStatus =
  | "payoutPaid"
  | "payoutFailed"
  | "payoutBlocked";

export interface DeveloperActivity {
  activityId: string;
  campaignId: "payout";
  type: "developer_event";
  status: DeveloperActivityStatus;
  createdAtMs: number;
  developerId: string;
  amountCents?: number;
  amountUsd?: string;
  providerEventId?: string;
  providerStatus?: number;
  providerCode?: string;
}

export type DeveloperActivityRecord = ImpressionActivity | DeveloperActivity;

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

export type ActivityRecord = DeveloperActivityRecord | AdvertiserActivity;

export interface ActivityRepository {
  record(activity: ActivityRecord): Promise<void>;
  listByDeveloper(developerId: string): Promise<DeveloperActivityRecord[]>;
  listByCampaignIds(campaignIds: string[]): Promise<ActivityRecord[]>;
  listByCheckoutSessionId(sessionId: string): Promise<AdvertiserActivity[]>;
}
