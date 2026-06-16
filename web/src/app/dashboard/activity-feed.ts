import { formatCentsAsUsd } from "@spinshare/core";

export type ActivityFeedStatus =
  | "tooShort"
  | "invalidToken"
  | "invalidCampaign"
  | "credited"
  | "shadowBanned"
  | "earningCapped"
  | "duplicate"
  | "checkoutStarted"
  | "budgetFunded"
  | "budgetDebited";

export type ActivityFeedType = "impression_attempt" | "advertiser_event";

export interface ActivityFeedSource {
  activityId: string;
  campaignId: string;
  type?: ActivityFeedType;
  status: ActivityFeedStatus;
  viewDurationMs?: number;
  createdAtMs: number;
  advertiserId?: string;
  developerId?: string;
  revenueMicrocents?: number;
  developerCreditCents?: number;
  developerCreditUsd?: string;
  amountCents?: number;
  amountMicrocents?: number;
  amountUsd?: string;
  providerEventId?: string;
  checkoutSessionId?: string;
}

export interface ActivityFeedRow extends ActivityFeedSource {
  statusLabel: string;
  durationLabel: string;
  creditLabel: string;
  counted: boolean;
}

export function activityStatusLabel(status: ActivityFeedStatus): string {
  switch (status) {
    case "credited":
      return "Credited";
    case "tooShort":
      return "Too short";
    case "invalidToken":
      return "Invalid token";
    case "invalidCampaign":
      return "Invalid campaign";
    case "shadowBanned":
      return "Suppressed";
    case "earningCapped":
      return "Earning cap";
    case "duplicate":
      return "Duplicate";
    case "checkoutStarted":
      return "Checkout started";
    case "budgetFunded":
      return "Budget funded";
    case "budgetDebited":
      return "Budget charged";
  }
}

export function formatActivityDuration(viewDurationMs: number): string {
  const safeMs = Math.max(0, viewDurationMs);
  return `${(safeMs / 1000).toFixed(1)}s`;
}

function activityCreditLabel(activity: ActivityFeedSource): string {
  if (activity.type === "advertiser_event") {
    if (activity.amountUsd !== undefined) {
      return `$${activity.amountUsd}`;
    }
    if (activity.amountCents !== undefined) {
      return `$${formatCentsAsUsd(activity.amountCents)}`;
    }
    if (activity.amountMicrocents !== undefined) {
      return formatMicrocentsAsUsd(activity.amountMicrocents);
    }
    return "$0.00";
  }
  if (activity.developerCreditUsd !== undefined) {
    return `$${activity.developerCreditUsd}`;
  }
  return `$${formatCentsAsUsd(activity.developerCreditCents ?? 0)}`;
}

function formatMicrocentsAsUsd(microcents: number): string {
  const sign = microcents < 0 ? "-" : "";
  const abs = Math.abs(microcents);
  const dollars = abs / 100_000;
  return `${sign}$${dollars >= 0.01 ? dollars.toFixed(2) : dollars.toFixed(4)}`;
}

function activityDurationLabel(activity: ActivityFeedSource): string {
  if (activity.type === "advertiser_event") {
    switch (activity.status) {
      case "checkoutStarted":
        return "Checkout created";
      case "budgetFunded":
        return "Funding confirmed";
      case "budgetDebited":
        return "Billable impression";
      default:
        return "Advertiser event";
    }
  }
  return formatActivityDuration(activity.viewDurationMs ?? 0);
}

export function toActivityFeedRows(
  activities: readonly ActivityFeedSource[],
): ActivityFeedRow[] {
  return activities
    .map((activity) => ({
      ...activity,
      statusLabel: activityStatusLabel(activity.status),
      durationLabel: activityDurationLabel(activity),
      creditLabel: activityCreditLabel(activity),
      counted:
        activity.status === "credited" ||
        activity.status === "budgetFunded" ||
        activity.status === "budgetDebited",
    }))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}
