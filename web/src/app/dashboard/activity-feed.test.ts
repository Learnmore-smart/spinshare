import { describe, expect, it } from "vitest";

import {
  activityDetailItems,
  activityStatusLabel,
  defaultActivityFeedCopy,
  formatActivityDuration,
  toActivityFeedRows,
  type ActivityFeedCopy,
  type ActivityFeedSource,
} from "./activity-feed";

const credited: ActivityFeedSource = {
  activityId: "activity_1",
  campaignId: "cmp_1",
  status: "credited",
  viewDurationMs: 3250,
  developerCreditCents: 2,
  developerCreditUsd: "0.02",
  createdAtMs: 1000,
};

const localizedCopy: ActivityFeedCopy = {
  ...defaultActivityFeedCopy,
  statuses: {
    ...defaultActivityFeedCopy.statuses,
    budgetDebited: "Budget debite",
  },
  eventLabels: {
    ...defaultActivityFeedCopy.eventLabels,
    billableImpression: "Impression facturable",
  },
  detailLabels: {
    ...defaultActivityFeedCopy.detailLabels,
    activityId: "ID activite",
    campaignId: "ID campagne",
    status: "Statut",
    event: "Evenement",
    amount: "Montant",
    created: "Cree",
  },
};

describe("activity feed helpers", () => {
  it("formats credited rows with status, duration, and USD credit", () => {
    const rows = toActivityFeedRows([credited]);

    expect(rows).toEqual([
      expect.objectContaining({
        activityId: "activity_1",
        statusLabel: "Credited",
        durationLabel: "3.3s",
        creditLabel: "$0.02",
      }),
    ]);
  });

  it("formats credited sub-cent rows with derived developer-share precision", () => {
    const rows = toActivityFeedRows([
      {
        ...credited,
        activityId: "activity_sub_cent",
        revenueMicrocents: 500,
        developerCreditCents: 0,
        developerCreditUsd: "0.00",
      },
    ]);

    expect(rows[0]).toMatchObject({
      statusLabel: "Credited",
      creditLabel: "$0.003",
      counted: true,
    });
  });

  it("formats too-short rows as zero-credit uncounted activity", () => {
    const rows = toActivityFeedRows([
      {
        ...credited,
        activityId: "activity_2",
        status: "tooShort",
        viewDurationMs: 900,
        developerCreditCents: 0,
        developerCreditUsd: "0.00",
      },
    ]);

    expect(rows[0]).toMatchObject({
      statusLabel: "Too short",
      durationLabel: "0.9s",
      creditLabel: "$0.00",
      counted: false,
    });
  });

  it("sorts newest activity first", () => {
    const rows = toActivityFeedRows([
      { ...credited, activityId: "old", createdAtMs: 1000 },
      { ...credited, activityId: "new", createdAtMs: 3000 },
    ]);

    expect(rows.map((row) => row.activityId)).toEqual(["new", "old"]);
  });

  it("formats advertiser money events with event labels and amount labels", () => {
    const rows = toActivityFeedRows([
      {
        activityId: "payment_evt_1",
        campaignId: "cmp_1",
        type: "advertiser_event",
        status: "budgetFunded",
        amountCents: 7500,
        amountUsd: "75.00",
        createdAtMs: 4000,
      },
    ]);

    expect(rows[0]).toMatchObject({
      activityId: "payment_evt_1",
      type: "advertiser_event",
      statusLabel: "Budget funded",
      durationLabel: "Funding confirmed",
      creditLabel: "$75.00",
      counted: true,
    });
  });

  it("formats activity rows and detail labels with caller-supplied locale copy", () => {
    const [row] = toActivityFeedRows(
      [
        {
          activityId: "debit_1",
          campaignId: "cmp_localized",
          type: "advertiser_event",
          status: "budgetDebited",
          amountMicrocents: 500,
          createdAtMs: 1_700_000_000_000,
        },
      ],
      localizedCopy,
    );
    expect(row).toBeDefined();

    expect(row).toMatchObject({
      statusLabel: "Budget debite",
      durationLabel: "Impression facturable",
      creditLabel: "$0.005",
    });
    expect(
      activityDetailItems(row!, {
        amountLabel: localizedCopy.detailLabels.amount,
        copy: localizedCopy,
      }),
    ).toEqual([
      { label: "ID activite", value: "debit_1" },
      { label: "ID campagne", value: "cmp_localized" },
      { label: "Statut", value: "Budget debite" },
      { label: "Evenement", value: "Impression facturable" },
      { label: "Montant", value: "$0.005" },
      { label: "Cree", value: "2023-11-14T22:13:20.000Z" },
    ]);
  });

  it("formats developer payout events with provider trace details", () => {
    const [row] = toActivityFeedRows([
      {
        activityId: "payout_paid_tr_123",
        campaignId: "payout",
        type: "developer_event",
        status: "payoutPaid",
        amountCents: 1234,
        amountUsd: "12.34",
        providerEventId: "tr_123",
        providerCode: "balance_available",
        createdAtMs: 1_700_000_000_000,
      } as ActivityFeedSource,
    ]);
    expect(row).toBeDefined();

    expect(row).toMatchObject({
      type: "developer_event",
      statusLabel: "Payout paid",
      durationLabel: "Transfer sent",
      creditLabel: "$12.34",
      counted: true,
    });
    expect(activityDetailItems(row!, { amountLabel: "Amount" })).toEqual([
      { label: "Activity ID", value: "payout_paid_tr_123" },
      { label: "Campaign ID", value: "payout" },
      { label: "Status", value: "Payout paid" },
      { label: "Event", value: "Transfer sent" },
      { label: "Amount", value: "$12.34" },
      { label: "Created", value: "2023-11-14T22:13:20.000Z" },
      { label: "Provider event", value: "tr_123" },
      { label: "Provider code", value: "balance_available" },
    ]);
  });

  it("keeps status and duration formatting stable", () => {
    expect(activityStatusLabel("invalidCampaign")).toBe("Invalid campaign");
    expect(activityStatusLabel("earningCapped")).toBe("Earning cap");
    expect(formatActivityDuration(12_345)).toBe("12.3s");
  });

  it("builds stable ledger detail fields including Stripe trace ids", () => {
    const [row] = toActivityFeedRows([
      {
        activityId: "payment_evt_1",
        campaignId: "cmp_1",
        type: "advertiser_event",
        status: "budgetFunded",
        amountCents: 7500,
        amountUsd: "75.00",
        checkoutSessionId: "cs_test_123",
        providerEventId: "evt_test_123",
        createdAtMs: 1_700_000_000_000,
      },
    ]);
    expect(row).toBeDefined();

    expect(activityDetailItems(row!, { amountLabel: "Amount" })).toEqual([
      { label: "Activity ID", value: "payment_evt_1" },
      { label: "Campaign ID", value: "cmp_1" },
      { label: "Status", value: "Budget funded" },
      { label: "Event", value: "Funding confirmed" },
      { label: "Amount", value: "$75.00" },
      { label: "Created", value: "2023-11-14T22:13:20.000Z" },
      { label: "Checkout session", value: "cs_test_123" },
      { label: "Provider event", value: "evt_test_123" },
    ]);
  });
});
