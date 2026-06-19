import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordImpression: vi.fn(),
  validateToken: vi.fn(),
  getCampaignById: vi.fn(),
  recordActivity: vi.fn(),
  incrementCampaignTelemetry: vi.fn(),
  getProgressByDeveloper: vi.fn(),
  addProgressDuration: vi.fn(),
  clearProgress: vi.fn(),
  consumeOnce: vi.fn(),
  incrementIpVelocity: vi.fn(),
  recordIpFanout: vi.fn(),
}));

vi.mock("@/server/container", () => ({
  getContainer: () => ({
    auth: {
      validateToken: mocks.validateToken,
    },
    campaigns: {
      getById: mocks.getCampaignById,
    },
    activities: {
      record: mocks.recordActivity,
    },
    counters: {
      incrementCampaignTelemetry: mocks.incrementCampaignTelemetry,
      consumeOnce: mocks.consumeOnce,
      incrementIpVelocity: mocks.incrementIpVelocity,
      recordIpFanout: mocks.recordIpFanout,
    },
    progress: {
      getByDeveloper: mocks.getProgressByDeveloper,
      addDuration: mocks.addProgressDuration,
      clearDeveloper: mocks.clearProgress,
    },
  }),
}));

vi.mock("@/server/ledger-service", () => ({
  INVALID_CAMPAIGN_ERROR: "invalid_or_insufficient_campaign",
  UNAUTHORIZED_ERROR: "unauthorized",
  recordImpression: mocks.recordImpression,
}));

import { POST } from "./route";
import { mintAdNonce } from "@/server/ad-nonce";

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

function resetMocks(): void {
  mocks.recordImpression.mockReset();
  mocks.validateToken.mockReset();
  mocks.getCampaignById.mockReset();
  mocks.recordActivity.mockReset();
  mocks.incrementCampaignTelemetry.mockReset();
  mocks.getProgressByDeveloper.mockReset();
  mocks.addProgressDuration.mockReset();
  mocks.clearProgress.mockReset();
  mocks.consumeOnce.mockReset();
  mocks.incrementIpVelocity.mockReset();
  mocks.recordIpFanout.mockReset();
}

describe("POST /api/track viewability validation", () => {
  it("records short positive views as pending progress without ledger mutation", async () => {
    resetMocks();
    mocks.validateToken.mockResolvedValueOnce({ userId: "dev_1" });
    mocks.getCampaignById.mockResolvedValueOnce({
      id: "cmp_1",
      advertiserId: "adv_1",
      cpmCents: 3000,
      budgetCents: 1000,
    });
    mocks.getProgressByDeveloper.mockResolvedValueOnce({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 0,
      updatedAtMs: 5,
    });
    mocks.addProgressDuration.mockResolvedValueOnce({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 1000,
      updatedAtMs: 10,
    });

    const response = await POST(
      trackRequest({ campaignId: "cmp_1", viewDurationMs: 1000 }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      recorded: false,
      accumulatedViewDurationMs: 1000,
      remainingViewDurationMs: 2000,
    });
    expect(mocks.recordImpression).not.toHaveBeenCalled();
    expect(mocks.addProgressDuration).toHaveBeenCalledWith({
      developerId: "dev_1",
      campaignId: "cmp_1",
      viewDurationMs: 1000,
      nowMs: expect.any(Number),
    });
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_1",
      "tooShort",
    );
    expect(mocks.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: "cmp_1",
        advertiserId: "adv_1",
        developerId: "dev_1",
        status: "tooShort",
        viewDurationMs: 1000,
      }),
    );
  });

  it("settles once cumulative view progress reaches 3 seconds", async () => {
    resetMocks();
    mocks.validateToken.mockResolvedValue({ userId: "dev_1" });
    mocks.getCampaignById.mockResolvedValue({
      id: "cmp_1",
      advertiserId: "adv_1",
      cpmCents: 3000,
      budgetCents: 1000,
    });
    mocks.getProgressByDeveloper.mockResolvedValue({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 1000,
      updatedAtMs: 10,
    });
    mocks.addProgressDuration.mockResolvedValueOnce({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 3000,
      updatedAtMs: 20,
    });
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
      trackRequest({ campaignId: "cmp_1", viewDurationMs: 2000 }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      recorded: true,
      developerCreditCents: 18,
      developerCreditUsd: "0.18",
    });
    expect(mocks.recordImpression).toHaveBeenCalledOnce();
    expect(mocks.clearProgress).toHaveBeenCalledWith("dev_1");
    expect(mocks.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: "cmp_1",
        advertiserId: "adv_1",
        developerId: "dev_1",
        status: "credited",
        viewDurationMs: 3000,
        developerCreditCents: 18,
      }),
    );
    expect(mocks.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: "cmp_1",
        advertiserId: "adv_1",
        type: "advertiser_event",
        status: "budgetDebited",
        amountMicrocents: 3000,
        amountUsd: "0.03",
      }),
    );
  });

  it("delegates eligible 3-second impressions to the ledger service", async () => {
    resetMocks();
    mocks.validateToken.mockResolvedValueOnce({ userId: "dev_1" });
    mocks.getCampaignById.mockResolvedValueOnce({
      id: "cmp_1",
      advertiserId: "adv_1",
      cpmCents: 3000,
      budgetCents: 1000,
    });
    mocks.getProgressByDeveloper.mockResolvedValueOnce({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 0,
      updatedAtMs: 20,
    });
    mocks.addProgressDuration.mockResolvedValueOnce({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 3000,
      updatedAtMs: 30,
    });
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
        auth: {
          validateToken: mocks.validateToken,
        },
        campaigns: {
          getById: mocks.getCampaignById,
        },
        counters: {
          incrementCampaignTelemetry: mocks.incrementCampaignTelemetry,
          consumeOnce: mocks.consumeOnce,
          incrementIpVelocity: mocks.incrementIpVelocity,
          recordIpFanout: mocks.recordIpFanout,
        },
      },
      { token: "tok_123", campaignId: "cmp_1", forceSuppress: false },
    );
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_1",
      "credited",
    );
    expect(mocks.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: "cmp_1",
        advertiserId: "adv_1",
        developerId: "dev_1",
        status: "credited",
        viewDurationMs: 3000,
        developerCreditCents: 18,
      }),
    );
  });

  it("rejects tracking for campaigns not served to the developer", async () => {
    resetMocks();
    mocks.validateToken.mockResolvedValueOnce({ userId: "dev_1" });
    mocks.getCampaignById.mockResolvedValueOnce({
      id: "cmp_1",
      advertiserId: "adv_1",
      cpmCents: 3000,
      budgetCents: 1000,
    });
    mocks.getProgressByDeveloper.mockResolvedValueOnce(null);

    const response = await POST(
      trackRequest({ campaignId: "cmp_1", viewDurationMs: 3000 }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({ error: "invalid_or_insufficient_campaign" });
    expect(mocks.addProgressDuration).not.toHaveBeenCalled();
    expect(mocks.recordImpression).not.toHaveBeenCalled();
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_1",
      "invalidCampaign",
    );
  });

  it("classifies token failures without exposing the reason to the client", async () => {
    resetMocks();
    mocks.validateToken.mockResolvedValueOnce(null);
    mocks.getCampaignById.mockResolvedValueOnce({
      id: "cmp_1",
      advertiserId: "adv_1",
    });
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
    expect(mocks.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: "cmp_1",
        advertiserId: "adv_1",
        status: "invalidToken",
        viewDurationMs: 3000,
      }),
    );
  });

  it("records invalid campaign outcomes in the activity ledger", async () => {
    resetMocks();
    mocks.validateToken.mockResolvedValueOnce({ userId: "dev_1" });
    mocks.getCampaignById.mockResolvedValueOnce(null);
    mocks.recordImpression.mockResolvedValueOnce({
      ok: false,
      status: 422,
      error: "invalid_or_insufficient_campaign",
    });

    const response = await POST(
      trackRequest({ campaignId: "cmp_missing", viewDurationMs: 3000 }),
    );

    expect(response.status).toBe(422);
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_missing",
      "invalidCampaign",
    );
    expect(mocks.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: "cmp_missing",
        developerId: "dev_1",
        status: "invalidCampaign",
        viewDurationMs: 3000,
      }),
    );
  });

  it("suppresses a forged client duration when server-clocked dwell is under 3 seconds", async () => {
    resetMocks();
    const justNow = Date.now();
    mocks.validateToken.mockResolvedValueOnce({ userId: "dev_1" });
    mocks.getCampaignById.mockResolvedValueOnce({
      id: "cmp_1",
      advertiserId: "adv_1",
      cpmCents: 3000,
      budgetCents: 1000,
    });
    // Ad was served essentially "now": no real wall-clock dwell has elapsed.
    mocks.getProgressByDeveloper.mockResolvedValueOnce({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 0,
      updatedAtMs: justNow,
      servedAtMs: justNow,
    });
    // The scripter claims a full 3 seconds in a single POST.
    mocks.addProgressDuration.mockResolvedValueOnce({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 3000,
      updatedAtMs: justNow,
      servedAtMs: justNow,
    });

    const response = await POST(
      trackRequest({ campaignId: "cmp_1", viewDurationMs: 3000 }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    // Client duration alone no longer settles: the server clock overrules it.
    expect(body.recorded).toBe(false);
    expect(mocks.recordImpression).not.toHaveBeenCalled();
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_1",
      "tooShort",
    );
  });

  it("settles when both client duration and server-clocked dwell reach 3 seconds", async () => {
    resetMocks();
    const servedAtMs = Date.now() - 10_000; // genuinely served 10s ago
    mocks.validateToken.mockResolvedValueOnce({ userId: "dev_1" });
    mocks.getCampaignById.mockResolvedValueOnce({
      id: "cmp_1",
      advertiserId: "adv_1",
      cpmCents: 3000,
      budgetCents: 1000,
    });
    mocks.getProgressByDeveloper.mockResolvedValueOnce({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 1000,
      updatedAtMs: servedAtMs,
      servedAtMs,
    });
    mocks.addProgressDuration.mockResolvedValueOnce({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 3000,
      updatedAtMs: Date.now(),
      servedAtMs,
    });
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
      trackRequest({ campaignId: "cmp_1", viewDurationMs: 2000 }),
    );

    expect(response.status).toBe(200);
    expect(mocks.recordImpression).toHaveBeenCalledOnce();
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_1",
      "credited",
    );
  });

  function seedSettleableProgress(): void {
    const servedAtMs = Date.now() - 10_000;
    mocks.validateToken.mockResolvedValueOnce({ userId: "dev_1" });
    mocks.getCampaignById.mockResolvedValueOnce({
      id: "cmp_1",
      advertiserId: "adv_1",
      cpmCents: 3000,
      budgetCents: 1000,
    });
    mocks.getProgressByDeveloper.mockResolvedValueOnce({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 0,
      updatedAtMs: servedAtMs,
      servedAtMs,
    });
    mocks.addProgressDuration.mockResolvedValueOnce({
      developerId: "dev_1",
      campaignId: "cmp_1",
      accumulatedViewDurationMs: 3000,
      updatedAtMs: Date.now(),
      servedAtMs,
    });
  }

  it("settles when a valid, fresh ad nonce is presented", async () => {
    resetMocks();
    seedSettleableProgress();
    mocks.consumeOnce.mockResolvedValueOnce(true);
    mocks.recordImpression.mockResolvedValueOnce({
      ok: true,
      settlement: "credited",
      response: {
        recorded: true,
        developerCreditCents: 18,
        developerCreditUsd: "0.18",
      },
    });
    const nonce = mintAdNonce({ campaignId: "cmp_1", developerId: "dev_1" });

    const response = await POST(
      trackRequest({ campaignId: "cmp_1", viewDurationMs: 3000, adNonce: nonce }),
    );

    expect(response.status).toBe(200);
    expect(mocks.consumeOnce).toHaveBeenCalledOnce();
    expect(mocks.recordImpression).toHaveBeenCalledOnce();
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_1",
      "credited",
    );
  });

  it("suppresses settlement when the ad nonce was already consumed (replay)", async () => {
    resetMocks();
    seedSettleableProgress();
    mocks.consumeOnce.mockResolvedValueOnce(false); // replay: already consumed
    const nonce = mintAdNonce({ campaignId: "cmp_1", developerId: "dev_1" });

    const response = await POST(
      trackRequest({ campaignId: "cmp_1", viewDurationMs: 3000, adNonce: nonce }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recorded).toBe(false);
    expect(mocks.recordImpression).not.toHaveBeenCalled();
    expect(mocks.clearProgress).toHaveBeenCalledWith("dev_1");
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_1",
      "duplicate",
    );
  });

  it("suppresses settlement (force-suppress) when the IP looks like an account farm", async () => {
    resetMocks();
    seedSettleableProgress();
    mocks.incrementIpVelocity.mockResolvedValueOnce(5);
    mocks.recordIpFanout.mockResolvedValueOnce(12); // (12-3)*1 = 9 >= suppressAt
    mocks.recordImpression.mockResolvedValueOnce({
      ok: true,
      settlement: "shadowBanned",
      response: {
        recorded: true,
        developerCreditCents: 18,
        developerCreditUsd: "0.18",
      },
    });

    const response = await POST(
      new Request("http://test.local/api/track", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer tok_123",
          "x-forwarded-for": "203.0.113.9, 10.0.0.1",
        },
        body: JSON.stringify({ campaignId: "cmp_1", viewDurationMs: 3000 }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.recordImpression).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ forceSuppress: true }),
    );
  });

  it("suppresses settlement when the ad nonce signature is invalid", async () => {
    resetMocks();
    seedSettleableProgress();

    const response = await POST(
      trackRequest({
        campaignId: "cmp_1",
        viewDurationMs: 3000,
        adNonce: "v1.tampered.signature",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recorded).toBe(false);
    expect(mocks.consumeOnce).not.toHaveBeenCalled(); // verify fails before consume
    expect(mocks.recordImpression).not.toHaveBeenCalled();
    expect(mocks.incrementCampaignTelemetry).toHaveBeenCalledWith(
      "cmp_1",
      "duplicate",
    );
  });
});
