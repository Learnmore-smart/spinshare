import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LocaleProvider } from "@/lib/i18n/locale-provider";
import {
  AdvertiserActivityFeed,
  advertiserActivityRowsToCsv,
  filterAdvertiserActivityRows,
} from "./advertiser-activity-feed";

describe("AdvertiserActivityFeed", () => {
  it("renders a loading state before activity arrives", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(AdvertiserActivityFeed, {
        state: { status: "loading" },
      }),
    );

    expect(html).toContain("Recent activity");
    expect(html).toContain("Loading activity");
  });

  it("renders user-facing budget-charge and non-billed activity rows", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(AdvertiserActivityFeed, {
        state: {
          status: "ready",
          activities: [
            {
              activityId: "debit_1",
              campaignId: "cmp_1",
              type: "advertiser_event",
              status: "budgetDebited",
              statusLabel: "Budget charged",
              counted: true,
              amountMicrocents: 500,
              durationLabel: "Billable impression",
              creditLabel: "$0.005",
              createdAtMs: 2000,
            },
            {
              activityId: "activity_2",
              campaignId: "cmp_2",
              status: "tooShort",
              statusLabel: "Too short",
              counted: false,
              viewDurationMs: 900,
              durationLabel: "0.9s",
              developerCreditCents: 0,
              developerCreditUsd: "0.00",
              creditLabel: "$0.00",
              createdAtMs: 1000,
            },
          ],
        },
      }),
    );

    expect(html).toContain("cmp_1");
    expect(html).toContain("Budget charged");
    expect(html).toContain("$0.005");
    expect(html).toContain("cmp_2");
    expect(html).toContain("Too short");
    expect(html).toContain("0.9s");
  });

  it("renders a load-more control when another activity page exists", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(AdvertiserActivityFeed, {
        state: {
          status: "ready",
          nextCursor: "1000:activity_1",
          activities: [
            {
              activityId: "activity_1",
              campaignId: "cmp_1",
              status: "budgetFunded",
              statusLabel: "Budget funded",
              counted: true,
              durationLabel: "Funding confirmed",
              creditLabel: "$5.00",
              createdAtMs: 1000,
            },
          ],
        },
        onLoadMore: () => undefined,
      }),
    );

    expect(html).toContain("Load more activity");
  });

  it("keeps existing rows visible while a later page is loading", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(AdvertiserActivityFeed, {
        state: {
          status: "ready",
          nextCursor: "1000:activity_1",
          loadingMore: true,
          loadMoreError: "Activity failed to load. Check your connection and retry.",
          activities: [
            {
              activityId: "activity_1",
              campaignId: "cmp_1",
              status: "budgetFunded",
              statusLabel: "Budget funded",
              counted: true,
              durationLabel: "Funding confirmed",
              creditLabel: "$5.00",
              createdAtMs: 1000,
            },
          ],
        },
        onLoadMore: () => undefined,
      }),
    );

    expect(html).toContain("cmp_1");
    expect(html).toContain("Loading more activity");
    expect(html).toContain("Activity failed to load");
  });

  it("filters visible activity rows by category and search query", () => {
    const rows = [
      {
        activityId: "funded_1",
        campaignId: "cmp_paid",
        type: "advertiser_event",
        status: "budgetFunded",
        statusLabel: "Budget funded",
        counted: true,
        durationLabel: "Funding confirmed",
        creditLabel: "$5.00",
        createdAtMs: 3000,
      },
      {
        activityId: "debit_1",
        campaignId: "cmp_billable",
        type: "advertiser_event",
        status: "budgetDebited",
        statusLabel: "Budget charged",
        counted: true,
        durationLabel: "Billable impression",
        creditLabel: "$0.005",
        createdAtMs: 2000,
      },
      {
        activityId: "short_1",
        campaignId: "cmp_no_charge",
        status: "tooShort",
        statusLabel: "Too short",
        counted: false,
        durationLabel: "0.7s",
        creditLabel: "$0.00",
        createdAtMs: 1000,
      },
    ] as const;

    expect(filterAdvertiserActivityRows(rows, "payments", "")).toHaveLength(1);
    expect(filterAdvertiserActivityRows(rows, "billable", "")).toEqual([
      rows[1],
    ]);
    expect(filterAdvertiserActivityRows(rows, "nonBillable", "")).toEqual([
      rows[2],
    ]);
    expect(filterAdvertiserActivityRows(rows, "all", "no charge")).toEqual([
      rows[2],
    ]);
  });

  it("exports visible advertiser activity rows as csv", () => {
    const csv = advertiserActivityRowsToCsv([
      {
        activityId: "activity_1",
        campaignId: "cmp_1",
        status: "budgetFunded",
        statusLabel: "Budget funded",
        counted: true,
        durationLabel: "Funding confirmed",
        creditLabel: "$5.00",
        createdAtMs: 1000,
      },
    ]);

    expect(csv).toContain("activityId,campaignId,status,duration,amount,createdAtMs");
    expect(csv).toContain("activity_1,cmp_1,Budget funded,Funding confirmed,$5.00,1000");
  });

  it("renders expandable ledger details for payment rows", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(AdvertiserActivityFeed, {
        state: {
          status: "ready",
          activities: [
            {
              activityId: "funded_1",
              campaignId: "cmp_paid",
              type: "advertiser_event",
              status: "budgetFunded",
              statusLabel: "Budget funded",
              counted: true,
              durationLabel: "Funding confirmed",
              creditLabel: "$5.00",
              checkoutSessionId: "cs_test_123",
              providerEventId: "evt_test_123",
              createdAtMs: 1_700_000_000_000,
            },
          ],
        },
      }),
    );

    expect(html).toContain("Details");
    expect(html).toContain("Activity ID");
    expect(html).toContain("funded_1");
    expect(html).toContain("Checkout session");
    expect(html).toContain("cs_test_123");
  });

  it("renders activity detail labels from the active locale", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(LocaleProvider, {
        initialLocale: "zh",
        children: React.createElement(AdvertiserActivityFeed, {
          state: {
            status: "ready",
            activities: [
              {
                activityId: "funded_zh",
                campaignId: "cmp_paid",
                type: "advertiser_event",
                status: "budgetFunded",
                statusLabel: "预算已入账",
                counted: true,
                durationLabel: "付款已确认",
                creditLabel: "$5.00",
                checkoutSessionId: "cs_test_zh",
                createdAtMs: 1_700_000_000_000,
              },
            ],
          },
        }),
      }),
    );

    expect(html).toContain("详情");
    expect(html).toContain("活动 ID");
    expect(html).toContain("结账会话");
  });
});
