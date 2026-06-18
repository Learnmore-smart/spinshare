import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  CAMPAIGN_BUILDER_DRAFT_KEY,
  CampaignBuilder,
  readCampaignBuilderDraft,
  writeCampaignBuilderDraft,
} from "./campaign-builder";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/advertiser",
}));

describe("CampaignBuilder", () => {
  it("collects impression blocks so Create campaign can open Stripe checkout", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(CampaignBuilder, {
        token: "tok_123",
        onCreated: () => undefined,
      }),
    );

    expect(html).toContain("Impression blocks");
    expect(html).toContain('name="blockCount"');
    expect(html).toContain("Create campaign");
  });

  it("persists a checkout draft for cancelled Stripe returns", () => {
    const storage = new Map<string, string>();
    const draft = {
      adText: "Try SpinShare for Claude Code",
      destinationUrl: "https://spinshare.dev/",
      brandName: "SpinShare",
      brandIconDataUrl: null,
      publicOnLeaderboard: false,
      cpm: "5.00",
      blockCount: "3",
    };

    writeCampaignBuilderDraft(
      {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      },
      draft,
    );

    expect(storage.has(CAMPAIGN_BUILDER_DRAFT_KEY)).toBe(true);
    expect(
      readCampaignBuilderDraft({
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      }),
    ).toEqual(draft);
  });
});
