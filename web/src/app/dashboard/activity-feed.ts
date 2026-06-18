import { DEVELOPER_SHARE_PERCENT, formatCentsAsUsd } from "@spinshare/core";

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
  | "budgetDebited"
  | "payoutPaid"
  | "payoutFailed"
  | "payoutBlocked";

export type ActivityFeedType =
  | "impression_attempt"
  | "advertiser_event"
  | "developer_event";

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
  providerStatus?: number;
  providerCode?: string;
}

export interface ActivityFeedRow extends ActivityFeedSource {
  statusLabel: string;
  durationLabel: string;
  creditLabel: string;
  counted: boolean;
}

export interface ActivityDetailItem {
  label: string;
  value: string;
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
    case "payoutPaid":
      return "Payout paid";
    case "payoutFailed":
      return "Payout failed";
    case "payoutBlocked":
      return "Payout blocked";
  }
}

export function formatActivityDuration(viewDurationMs: number): string {
  const safeMs = Math.max(0, viewDurationMs);
  return `${(safeMs / 1000).toFixed(1)}s`;
}

function activityCreditLabel(activity: ActivityFeedSource): string {
  if (
    activity.type === "advertiser_event" ||
    activity.type === "developer_event"
  ) {
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
  if (
    activity.status === "credited" &&
    activity.revenueMicrocents !== undefined &&
    activity.revenueMicrocents > 0 &&
    (activity.developerCreditCents ?? 0) === 0 &&
    (activity.developerCreditUsd === undefined ||
      activity.developerCreditUsd === "0.00")
  ) {
    const displayCreditMicrocents = Math.floor(
      (activity.revenueMicrocents * DEVELOPER_SHARE_PERCENT + 50) / 100,
    );
    if (displayCreditMicrocents > 0) {
      return formatMicrocentsAsUsd(displayCreditMicrocents);
    }
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
  const fixed = dollars.toFixed(3);
  const trimmed = fixed.endsWith("0") ? fixed.slice(0, -1) : fixed;
  return `${sign}$${trimmed}`;
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
  if (activity.type === "developer_event") {
    switch (activity.status) {
      case "payoutPaid":
        return "Transfer sent";
      case "payoutFailed":
        return "Transfer failed";
      case "payoutBlocked":
        return "Not paid";
      default:
        return "Developer event";
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
        activity.status === "budgetDebited" ||
        activity.status === "payoutPaid",
    }))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export function activityDetailItems(
  activity: ActivityFeedRow,
  options: { amountLabel?: string } = {},
): ActivityDetailItem[] {
  const items: ActivityDetailItem[] = [
    { label: "Activity ID", value: activity.activityId },
    { label: "Campaign ID", value: activity.campaignId },
    { label: "Status", value: activity.statusLabel },
    {
      label:
        activity.type === "advertiser_event" ||
        activity.type === "developer_event"
          ? "Event"
          : "Duration",
      value: activity.durationLabel,
    },
    { label: options.amountLabel ?? "Amount", value: activity.creditLabel },
    { label: "Created", value: new Date(activity.createdAtMs).toISOString() },
  ];

  if (activity.checkoutSessionId !== undefined) {
    items.push({
      label: "Checkout session",
      value: activity.checkoutSessionId,
    });
  }
  if (activity.providerEventId !== undefined) {
    items.push({
      label: "Provider event",
      value: activity.providerEventId,
    });
  }
  if (activity.providerStatus !== undefined) {
    items.push({
      label: "Provider status",
      value: String(activity.providerStatus),
    });
  }
  if (activity.providerCode !== undefined) {
    items.push({
      label: "Provider code",
      value: activity.providerCode,
    });
  }

  return items;
}
