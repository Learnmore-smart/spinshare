import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordImpression: vi.fn(),
  incrementCampaignTelemetry: vi.fn(),
}));

vi.mock("@/server/container", () => ({
  getContainer: () => ({
    auth: {},
    campaigns: {},
    counters: {
      incrementCampaignTelemetry: mocks.incrementCampaignTelemetry,
    },
  }),
}));

vi.mock("@/server/ledger-service", () => ({
  recordImpression: mocks.recordImpression,
}));

import { POST } from "./route";

function trackRequest(body: unknown): Request {
  return new Request("http://test.local/api/track", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer tok_123",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/track viewability validation", () => {
  it("rejects impressions below the 3-second minimum before ledger mutation", async () => {
    mocks.recordImpression.mockReset();
    mocks.incrementCampaignTelemetry.mockReset();
    mocks.recordImpression.mockResolvedValueOnce({
      ok: true,
      settlement: "credited",
      response: {
        recorded: true,
        developerCreditCents: 18,
        developerCreditUsd: "0.18",
      },
    });

    const response = await POST(
      trackRequest({ campaignId: "cmp_1", viewDurationMs: 2999 }),
    );

    expect(response.status).toBe(400);
    expect(mocks.recordImpression).not.toHaveBeenCalled();
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_1",
      "tooShort",
    );
  });

  it("delegates eligible 3-second impressions to the ledger service", async () => {
    mocks.recordImpression.mockReset();
    mocks.incrementCampaignTelemetry.mockReset();
    mocks.recordImpression.mockResolvedValueOnce({
      ok: true,
      settlement: "credited",
      response: {
        recorded: true,
        developerCreditCents: 18,
        developerCreditUsd: "0.18",
      },
    });

    const response = await POST(
      trackRequest({ campaignId: "cmp_1", viewDurationMs: 3000 }),
    );

    expect(response.status).toBe(200);
    expect(mocks.recordImpression).toHaveBeenCalledWith(
      {
        auth: {},
        campaigns: {},
        counters: {
          incrementCampaignTelemetry: mocks.incrementCampaignTelemetry,
        },
      },
      { token: "tok_123", campaignId: "cmp_1" },
    );
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_1",
      "credited",
    );
  });

  it("classifies token failures without exposing the reason to the client", async () => {
    mocks.recordImpression.mockReset();
    mocks.incrementCampaignTelemetry.mockReset();
    mocks.recordImpression.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "unauthorized",
    });

    const response = await POST(
      trackRequest({ campaignId: "cmp_1", viewDurationMs: 3000 }),
    );

    expect(response.status).toBe(401);
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_1",
      "invalidToken",
    );
  });
});
