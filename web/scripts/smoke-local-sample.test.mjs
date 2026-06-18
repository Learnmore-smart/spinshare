import { describe, expect, it } from "vitest";

import {
  isLocalSampleAdResponse,
  isLocalSampleMarketResponse,
  jsonPostInit,
  processTreeKillCommand,
  summarizeLocalSampleAd,
  summarizeLocalSampleMarket,
} from "./smoke-local-sample.mjs";

const validMarket = {
  rows: [
    {
      id: "cmp-local-demo",
      adText: "SpinShare Local - sample ad for localhost testing",
      bidLabel: "$30.00 / 1k imps",
      remainingBudgetUsd: "$50.00",
    },
  ],
  summary: {
    liveCampaigns: 1,
    topCpmCents: 3000,
    topCpmUsd: "$30.00",
  },
};

const validAd = {
  adAvailable: true,
  campaignId: "cmp-local-demo",
  adText: "SpinShare Local - sample ad for localhost testing",
  destinationUrl:
    "http://localhost:3000/api/click?campaignId=cmp-local-demo&clickToken=token",
  brandName: "SpinShare Local",
  cpmCents: 3000,
  cpmUsd: "30.00",
};

describe("local sample smoke helpers", () => {
  it("accepts the seeded local market response", () => {
    expect(isLocalSampleMarketResponse(validMarket)).toBe(true);
  });

  it("rejects missing or non-local market responses", () => {
    expect(isLocalSampleMarketResponse(null)).toBe(false);
    expect(isLocalSampleMarketResponse({ rows: [], summary: {} })).toBe(false);
    expect(
      isLocalSampleMarketResponse({
        ...validMarket,
        rows: [{ ...validMarket.rows[0], id: "cmp-prod-demo" }],
      }),
    ).toBe(false);
    expect(
      isLocalSampleMarketResponse({
        ...validMarket,
        rows: [{ ...validMarket.rows[0], adText: "LearnX production ad" }],
      }),
    ).toBe(false);
  });

  it("summarizes the local sample campaign for smoke output", () => {
    expect(summarizeLocalSampleMarket(validMarket)).toEqual({
      liveCampaigns: 1,
      campaignId: "cmp-local-demo",
      adText: "SpinShare Local - sample ad for localhost testing",
      bidLabel: "$30.00 / 1k imps",
      remainingBudgetUsd: "$50.00",
    });
  });

  it("accepts and summarizes the authenticated local sample ad response", () => {
    expect(isLocalSampleAdResponse(validAd)).toBe(true);
    expect(
      isLocalSampleAdResponse({
        ...validAd,
        destinationUrl: "https://www.spinshare.dev",
      }),
    ).toBe(false);
    expect(isLocalSampleAdResponse({ adAvailable: false })).toBe(false);
    expect(summarizeLocalSampleAd(validAd)).toEqual({
      campaignId: "cmp-local-demo",
      adText: "SpinShare Local - sample ad for localhost testing",
      brandName: "SpinShare Local",
      cpmUsd: "30.00",
      destinationHost: "localhost:3000",
    });
  });

  it("uses a process-tree kill command on Windows", () => {
    expect(processTreeKillCommand("win32", 1234)).toEqual({
      command: "taskkill.exe",
      args: ["/pid", "1234", "/t", "/f"],
    });
    expect(processTreeKillCommand("linux", 1234)).toBe(null);
  });

  it("builds JSON POST request init for device endpoints", () => {
    expect(jsonPostInit({ deviceCode: "dc_1" })).toEqual({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"deviceCode":"dc_1"}',
    });
  });
});
