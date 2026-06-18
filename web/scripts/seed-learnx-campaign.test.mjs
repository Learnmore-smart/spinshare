import { describe, expect, it } from "vitest";

import {
  campaignCollectionPath,
  LEARNX_CAMPAIGN_DESTINATION_URL,
} from "./seed-learnx-campaign.mjs";

describe("seed-learnx-campaign", () => {
  it("uses the same namespace-aware campaign collection as local Firestore", () => {
    expect(campaignCollectionPath({})).toBe("campaigns");
    expect(
      campaignCollectionPath({ SPINSHARE_FIRESTORE_NAMESPACE: "test" }),
    ).toBe("namespaces/test/campaigns");
    expect(
      campaignCollectionPath({ SPINSHARE_FIRESTORE_NAMESPACE: "local.dev" }),
    ).toBe("namespaces/local.dev/campaigns");
    expect(() =>
      campaignCollectionPath({ SPINSHARE_FIRESTORE_NAMESPACE: "bad/slash" }),
    ).toThrow("Invalid SPINSHARE_FIRESTORE_NAMESPACE");
  });

  it("seeds the LearnX demo destination URL", () => {
    expect(LEARNX_CAMPAIGN_DESTINATION_URL).toBe("https://www.learnx.pro");
  });
});
