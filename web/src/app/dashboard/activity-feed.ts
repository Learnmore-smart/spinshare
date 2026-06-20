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
  | "developer_event"
  | "welcome_gift";

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

export interface ActivityFeedCopy {
  statuses: Record<ActivityFeedStatus, string>;
  eventLabels: {
    checkoutCreated: string;
    fundingConfirmed: string;
    billableImpression: string;
    advertiserEvent: string;
    transferSent: string;
    transferFailed: string;
    notPaid: string;
    developerEvent: string;
    welcomeGift: string;
  };
  durationSeconds: (seconds: string) => string;
  detailsSummary: string;
  detailLabels: {
    activityId: string;
    campaignId: string;
    status: string;
    event: string;
    duration: string;
    amount: string;
    created: string;
    checkoutSession: string;
    providerEvent: string;
    providerStatus: string;
    providerCode: string;
  };
}

export const defaultActivityFeedCopy: ActivityFeedCopy = {
  statuses: {
    credited: "Credited",
    tooShort: "Too short",
    invalidToken: "Invalid token",
    invalidCampaign: "Invalid campaign",
    shadowBanned: "Suppressed",
    earningCapped: "Earning cap",
    duplicate: "Duplicate",
    checkoutStarted: "Checkout started",
    budgetFunded: "Budget funded",
    budgetDebited: "Budget charged",
    payoutPaid: "Payout paid",
    payoutFailed: "Payout failed",
    payoutBlocked: "Payout blocked",
  },
  eventLabels: {
    checkoutCreated: "Checkout created",
    fundingConfirmed: "Funding confirmed",
    billableImpression: "Billable impression",
    advertiserEvent: "Advertiser event",
    transferSent: "Transfer sent",
    transferFailed: "Transfer failed",
    notPaid: "Not paid",
    developerEvent: "Developer event",
    welcomeGift: "Welcome gift",
  },
  durationSeconds: (seconds) => `${seconds}s`,
  detailsSummary: "Details",
  detailLabels: {
    activityId: "Activity ID",
    campaignId: "Campaign ID",
    status: "Status",
    event: "Event",
    duration: "Duration",
    amount: "Amount",
    created: "Created",
    checkoutSession: "Checkout session",
    providerEvent: "Provider event",
    providerStatus: "Provider status",
    providerCode: "Provider code",
  },
};

export function activityStatusLabel(
  status: ActivityFeedStatus,
  copy: ActivityFeedCopy = defaultActivityFeedCopy,
): string {
  return copy.statuses[status];
}

export function formatActivityDuration(
  viewDurationMs: number,
  copy: ActivityFeedCopy = defaultActivityFeedCopy,
): string {
  const safeMs = Math.max(0, viewDurationMs);
  return copy.durationSeconds((safeMs / 1000).toFixed(1));
}

function activityCreditLabel(activity: ActivityFeedSource): string {
  if (
    activity.type === "advertiser_event" ||
    activity.type === "developer_event" ||
    activity.type === "welcome_gift"
  ) {
    let amountLabel: string;
    if (activity.amountUsd !== undefined) {
      amountLabel = `$${activity.amountUsd}`;
    } else if (activity.amountCents !== undefined) {
      amountLabel = `$${formatCentsAsUsd(activity.amountCents)}`;
    } else if (activity.amountMicrocents !== undefined) {
      amountLabel = formatMicrocentsAsUsd(activity.amountMicrocents);
    } else {
      amountLabel = "$0.00";
    }
    return activity.type === "welcome_gift" ? `+${amountLabel}` : amountLabel;
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

function activityDurationLabel(
  activity: ActivityFeedSource,
  copy: ActivityFeedCopy,
): string {
  if (activity.type === "welcome_gift") {
    return copy.eventLabels.welcomeGift;
  }
  if (activity.type === "advertiser_event") {
    switch (activity.status) {
      case "checkoutStarted":
        return copy.eventLabels.checkoutCreated;
      case "budgetFunded":
        return copy.eventLabels.fundingConfirmed;
      case "budgetDebited":
        return copy.eventLabels.billableImpression;
      default:
        return copy.eventLabels.advertiserEvent;
    }
  }
  if (activity.type === "developer_event") {
    switch (activity.status) {
      case "payoutPaid":
        return copy.eventLabels.transferSent;
      case "payoutFailed":
        return copy.eventLabels.transferFailed;
      case "payoutBlocked":
        return copy.eventLabels.notPaid;
      default:
        return copy.eventLabels.developerEvent;
    }
  }
  return formatActivityDuration(activity.viewDurationMs ?? 0, copy);
}

export function toActivityFeedRows(
  activities: readonly ActivityFeedSource[],
  copy: ActivityFeedCopy = defaultActivityFeedCopy,
): ActivityFeedRow[] {
  return activities
    .map((activity) => ({
      ...activity,
      statusLabel: activityStatusLabel(activity.status, copy),
      durationLabel: activityDurationLabel(activity, copy),
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
  options: { amountLabel?: string; copy?: ActivityFeedCopy } = {},
): ActivityDetailItem[] {
  const copy = options.copy ?? defaultActivityFeedCopy;
  const labels = copy.detailLabels;
  const items: ActivityDetailItem[] = [
    { label: labels.activityId, value: activity.activityId },
    { label: labels.campaignId, value: activity.campaignId },
    { label: labels.status, value: activity.statusLabel },
    {
      label:
        activity.type === "advertiser_event" ||
        activity.type === "developer_event" ||
        activity.type === "welcome_gift"
          ? labels.event
          : labels.duration,
      value: activity.durationLabel,
    },
    {
      label: options.amountLabel ?? labels.amount,
      value: activity.creditLabel,
    },
    {
      label: labels.created,
      value: new Date(activity.createdAtMs).toISOString(),
    },
  ];

  if (activity.checkoutSessionId !== undefined) {
    items.push({
      label: labels.checkoutSession,
      value: activity.checkoutSessionId,
    });
  }
  if (activity.providerEventId !== undefined) {
    items.push({
      label: labels.providerEvent,
      value: activity.providerEventId,
    });
  }
  if (activity.providerStatus !== undefined) {
    items.push({
      label: labels.providerStatus,
      value: String(activity.providerStatus),
    });
  }
  if (activity.providerCode !== undefined) {
    items.push({
      label: labels.providerCode,
      value: activity.providerCode,
    });
  }

  return items;
}
