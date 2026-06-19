import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MICROCENTS_PER_CENT, computeSplit, type Campaign, type User } from "@spinshare/core";

import {
  getContainer,
  resetContainer,
  type Container,
} from "@/server/container";
import {
  MemoryCampaignRepository,
  MemoryActivityRepository,
  MemoryLedgerRepository,
  MemoryUserRepository,
  MockAuthProvider,
} from "@/server/adapters/memory";
import { publicAdvertiserIdForEmail } from "@/server/advertiser-identity";
import type {
  CheckoutInput,
  CheckoutSessionFunding,
  CheckoutSessionResult,
  PaymentGateway,
  StripeEvent,
} from "@/server/ports/payment-gateway";

import { DELETE, GET, PATCH, POST } from "./route";
import { POST as advertiserCheckout } from "../advertiser-checkout/route";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.SPINSHARE_MODE = "local";
  process.env.SPINSHARE_COUNTER = "memory";
  delete process.env.FIRESTORE_EMULATOR_HOST;
  process.env.STRIPE_MODE = "mock";
  process.env.AUTH_MODE = "mock";
  resetContainer();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  resetContainer();
});

function seedCampaign(
  container: Container,
  overrides: Partial<Campaign> & Pick<Campaign, "id">,
): void {
  const campaign: Campaign = {
    advertiserId: "adv1",
    adText: "Try Linear for issue tracking",
    cpmCents: 3000,
    budgetCents: 5000,
    status: "active",
    createdAtMs: 0,
    ...overrides,
  };
  (container.campaigns as MemoryCampaignRepository).seed(campaign);
}

function authRequest(token: string): Request {
  return new Request("https://spinshare.test/api/campaigns", {
    headers: { authorization: `Bearer ${token}` },
  });
}

function authenticatedPostRequest(token: string, body: unknown): Request {
  return new Request("https://spinshare.test/api/campaigns", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function authenticatedPatchRequest(token: string, body: unknown): Request {
  return new Request("https://spinshare.test/api/campaigns", {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function authenticatedDeleteRequest(token: string, body: unknown): Request {
  return new Request("https://spinshare.test/api/campaigns", {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function publicCheckoutRequest(body: unknown): Request {
  return new Request("https://spinshare.test/api/advertiser-checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

class CheckoutLookupGateway implements PaymentGateway {
  constructor(
    private readonly sessions: Record<string, CheckoutSessionFunding>,
  ) {}

  async createCheckoutSession(
    _input: CheckoutInput,
  ): Promise<CheckoutSessionResult> {
    throw new Error("not used");
  }

  verifyAndParseWebhook(_rawBody: Buffer, _signature: string): StripeEvent {
    throw new Error("not used");
  }

  async retrieveCheckoutSessionFunding(
    sessionId: string,
  ): Promise<CheckoutSessionFunding | null> {
    return this.sessions[sessionId] ?? null;
  }
}

describe("GET /api/campaigns telemetry", () => {
  it("returns zero-filled telemetry for quiet campaigns", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_quiet" });
    const token = (container.auth as MockAuthProvider).mintToken("adv1");

    const response = await GET(authRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaigns[0]).toMatchObject({
      id: "cmp_quiet",
      telemetry: {
        shows: 0,
        clicks: 0,
        credited: 0,
        tooShort: 0,
        invalidToken: 0,
        invalidCampaign: 0,
        shadowBanned: 0,
        earningCapped: 0,
        duplicate: 0,
      },
    });
  });

  it("returns aggregate telemetry and durable credited counts for owned campaigns", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_live" });
    seedCampaign(container, { id: "cmp_other", advertiserId: "adv2" });
    const token = (container.auth as MockAuthProvider).mintToken("adv1");
    await container.counters.incrementCampaignTelemetry("cmp_live", "shows");
    await container.counters.incrementCampaignTelemetry("cmp_live", "clicks");
    await container.counters.incrementCampaignTelemetry("cmp_live", "tooShort");
    (container.ledger as MemoryLedgerRepository).seed([
      {
        entryId: "entry-1",
        campaignId: "cmp_live",
        developerId: "dev-1",
        revenueMicrocents: 3000,
        developerCreditCents: 2,
        spinshareRetentionMicrocents: 998,
      },
    ]);

    const response = await GET(authRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaigns).toHaveLength(1);
    expect(body.campaigns[0]).toMatchObject({
      id: "cmp_live",
      telemetry: {
        shows: 1,
        clicks: 1,
        credited: 1,
        tooShort: 1,
      },
    });
  });

  it("flushes pending impressions before returning campaign budget and credited counts", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_pending", cpmCents: 3000, budgetCents: 5000 });
    (container.users as MemoryUserRepository).seed({
      id: "dev-1",
      email: "dev@example.com",
      provider: "github",
      role: "developer",
      balanceCents: 0,
    } satisfies User);
    const split = computeSplit(3000);
    await container.counters.applyImpression({
      developerId: "dev-1",
      campaignId: "cmp_pending",
      entryId: "entry-pending-1",
      split,
      occurredAtMs: Date.now(),
    });
    const token = (container.auth as MockAuthProvider).mintToken("adv1");

    const response = await GET(authRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaigns[0]).toMatchObject({
      id: "cmp_pending",
      budgetCents:
        5000 - Math.round(split.revenueMicrocents / MICROCENTS_PER_CENT),
      telemetry: {
        credited: 1,
      },
    });
  });

  it("includes public checkout campaigns claimed by the authenticated email", async () => {
    const container = getContainer();
    const checkoutResponse = await advertiserCheckout(
      publicCheckoutRequest({
        email: "ads@example.com",
        adText: "Hire faster with SpinShare Ads",
        destinationUrl: "https://spinshare.dev/",
        brandName: "SpinShare",
        publicOnLeaderboard: true,
        cpmCents: 500,
        blockCount: 2,
      }),
    );
    const checkout = await checkoutResponse.json();
    const token = (container.auth as MockAuthProvider).mintToken("google:123", {
      email: "ads@example.com",
    });

    const response = await GET(authRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaigns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: checkout.campaign.id,
          contactEmail: "ads@example.com",
          adText: "Hire faster with SpinShare Ads",
        }),
      ]),
    );
  });

  it("reconciles paid checkout sessions before returning claimed public campaigns", async () => {
    const container = getContainer();
    const advertiserId = publicAdvertiserIdForEmail("ads@example.com");
    const campaign = await container.campaigns.create({
      advertiserId,
      contactEmail: "ads@example.com",
      adText: "Paid checkout campaign",
      destinationUrl: "https://spinshare.dev/",
      brandName: "SpinShare",
      publicOnLeaderboard: true,
      cpmCents: 500,
    });
    await (container.activities as MemoryActivityRepository).record({
      activityId: "checkoutStarted_cs_dashboard",
      campaignId: campaign.id,
      advertiserId,
      type: "advertiser_event",
      status: "checkoutStarted",
      amountCents: 500,
      amountUsd: "5.00",
      checkoutSessionId: "cs_dashboard",
      createdAtMs: 1000,
    });
    container.payments = new CheckoutLookupGateway({
      cs_dashboard: {
        sessionId: "cs_dashboard",
        status: "paid",
        campaignId: campaign.id,
        amountCents: 500,
      },
    });
    const token = (container.auth as MockAuthProvider).mintToken("google:123", {
      email: "ads@example.com",
    });

    const response = await GET(authRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaigns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: campaign.id,
          budgetCents: 500,
          remainingBudgetUsd: "5.00",
        }),
      ]),
    );
    expect((container.activities as MemoryActivityRepository).all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "budgetFunded",
          checkoutSessionId: "cs_dashboard",
          amountCents: 500,
        }),
      ]),
    );

    const repeat = await GET(authRequest(token));
    expect(repeat.status).toBe(200);
    await expect(container.campaigns.getById(campaign.id)).resolves.toMatchObject({
      budgetCents: 500,
    });
    expect(
      (container.activities as MemoryActivityRepository)
        .all()
        .filter(
          (activity) =>
            activity.type === "advertiser_event" &&
            activity.status === "budgetFunded" &&
            activity.checkoutSessionId === "cs_dashboard",
        ),
    ).toHaveLength(1);
  });
});

describe("POST /api/campaigns safety", () => {
  it("creates a campaign and starts Stripe checkout when blockCount is provided", async () => {
    const container = getContainer();
    const token = (container.auth as MockAuthProvider).mintToken("adv1");

    const response = await POST(
      authenticatedPostRequest(token, {
        adText: "Try SpinShare for Claude Code",
        cpmCents: 500,
        destinationUrl: "https://spinshare.dev/",
        brandName: "SpinShare",
        publicOnLeaderboard: true,
        blockCount: 3,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.sessionId).toMatch(/^cs_/);
    expect(body.url).toBe(
      `https://spinshare.test/dashboard/advertiser?funding=success&checkout_session_id=${body.sessionId}`,
    );
    expect(body.amountCents).toBe(1500);
    expect(body.amountUsd).toBe("$15.00");
    expect(body.campaign).toMatchObject({
      advertiserId: "adv1",
      adText: "Try SpinShare for Claude Code",
      cpmCents: 500,
      budgetCents: 1500,
      destinationUrl: "https://spinshare.dev/",
      brandName: "SpinShare",
      publicOnLeaderboard: true,
    });
    await expect(container.campaigns.getById(body.campaign.id)).resolves.toMatchObject({
      budgetCents: 1500,
    });
    expect((container.activities as MemoryActivityRepository).all()).toEqual([
      expect.objectContaining({
        campaignId: body.campaign.id,
        advertiserId: "adv1",
        type: "advertiser_event",
        status: "checkoutStarted",
        amountCents: 1500,
        amountUsd: "15.00",
        checkoutSessionId: body.sessionId,
      }),
      expect.objectContaining({
        campaignId: body.campaign.id,
        advertiserId: "adv1",
        type: "advertiser_event",
        status: "budgetFunded",
        amountCents: 1500,
        amountUsd: "15.00",
        checkoutSessionId: body.sessionId,
      }),
    ]);
  });

  it("rejects unsafe ad copy before creating an authenticated campaign", async () => {
    const container = getContainer();
    const token = (container.auth as MockAuthProvider).mintToken("adv1");

    const response = await POST(
      authenticatedPostRequest(token, {
        adText: "Enter your seed phrase to restore wallet",
        cpmCents: 500,
        destinationUrl: "https://example.com/",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Ad text appears unsafe or deceptive");
    expect(await container.campaigns.listByAdvertiser("adv1")).toEqual([]);
  });
});

describe("PATCH /api/campaigns", () => {
  it("lets an owner update campaign details and re-approve edited content", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_edit",
      adText: "Old ad copy",
      destinationUrl: "https://old.example.com/",
      brandName: "Old Brand",
      publicOnLeaderboard: true,
      cpmCents: 500,
      reviewStatus: "approved",
    });
    const token = (container.auth as MockAuthProvider).mintToken("adv1");

    const response = await PATCH(
      authenticatedPatchRequest(token, {
        campaignId: "cmp_edit",
        adText: "Learn faster with LearnX",
        destinationUrl: "https://learnx.pro/",
        brandName: "LearnX",
        brandIconDataUrl: "data:image/png;base64,AAAA",
        publicOnLeaderboard: false,
        cpmCents: 700,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: "cmp_edit",
      adText: "Learn faster with LearnX",
      destinationUrl: "https://learnx.pro/",
      brandName: "LearnX",
      brandIconDataUrl: "data:image/png;base64,AAAA",
      publicOnLeaderboard: false,
      cpmCents: 700,
      reviewStatus: "approved",
      cpmUsd: "7.00",
    });
    await expect(container.campaigns.getById("cmp_edit")).resolves.toMatchObject({
      adText: "Learn faster with LearnX",
      destinationUrl: "https://learnx.pro/",
      cpmCents: 700,
      reviewStatus: "approved",
    });
  });

  it("accepts a 64 KiB uploaded brand icon during edits", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_icon_upload",
      adText: "Try LearnX for faster study",
      destinationUrl: "https://learnx.pro/",
    });
    const token = (container.auth as MockAuthProvider).mintToken("adv1");
    const icon = `data:image/png;base64,${Buffer.alloc(64 * 1024).toString("base64")}`;

    const response = await PATCH(
      authenticatedPatchRequest(token, {
        campaignId: "cmp_icon_upload",
        brandIconDataUrl: icon,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: "cmp_icon_upload",
      brandIconDataUrl: icon,
    });
    await expect(container.campaigns.getById("cmp_icon_upload")).resolves.toMatchObject({
      brandIconDataUrl: icon,
    });
  });

  it("lets a signed-in same-email advertiser edit a public checkout campaign", async () => {
    const container = getContainer();
    const advertiserId = publicAdvertiserIdForEmail("buyer@example.com");
    const campaign = await container.campaigns.create({
      advertiserId,
      contactEmail: "buyer@example.com",
      adText: "Original public checkout ad",
      destinationUrl: "https://old.example.com/",
      cpmCents: 500,
    });
    const token = (container.auth as MockAuthProvider).mintToken("google:buyer", {
      email: "Buyer@Example.com",
    });

    const response = await PATCH(
      authenticatedPatchRequest(token, {
        campaignId: campaign.id,
        destinationUrl: "https://learnx.pro/",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: campaign.id,
      advertiserId,
      destinationUrl: "https://learnx.pro/",
    });
  });

  it("rejects campaign edits from non-owners", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_owned",
      destinationUrl: "https://old.example.com/",
    });
    const token = (container.auth as MockAuthProvider).mintToken("adv2");

    const response = await PATCH(
      authenticatedPatchRequest(token, {
        campaignId: "cmp_owned",
        adText: "Should not save",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
    await expect(container.campaigns.getById("cmp_owned")).resolves.toMatchObject({
      adText: "Try Linear for issue tracking",
    });
  });

  it("rejects unsafe edited ad copy before mutating the campaign", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_safe",
      adText: "Safe original copy",
      destinationUrl: "https://old.example.com/",
    });
    const token = (container.auth as MockAuthProvider).mintToken("adv1");

    const response = await PATCH(
      authenticatedPatchRequest(token, {
        campaignId: "cmp_safe",
        adText: "Enter your seed phrase to restore wallet",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Ad text appears unsafe or deceptive");
    await expect(container.campaigns.getById("cmp_safe")).resolves.toMatchObject({
      adText: "Safe original copy",
    });
  });
});

describe("DELETE /api/campaigns", () => {
  it("permanently deletes an owned unpaid campaign", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_unpaid",
      budgetCents: 0,
      destinationUrl: "https://example.com/",
    });
    const token = (container.auth as MockAuthProvider).mintToken("adv1");

    const response = await DELETE(
      authenticatedDeleteRequest(token, { campaignId: "cmp_unpaid" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ deleted: true, campaignId: "cmp_unpaid" });
    await expect(container.campaigns.getById("cmp_unpaid")).resolves.toBeNull();
  });

  it("deletes through a stale development memory repository without delete()", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_stale",
      budgetCents: 0,
      destinationUrl: "https://example.com/",
    });
    const token = (container.auth as MockAuthProvider).mintToken("adv1");
    const staleCampaigns = Object.create(Object.getPrototypeOf(container.campaigns));
    Object.assign(staleCampaigns, container.campaigns);
    staleCampaigns.delete = undefined;
    container.campaigns = staleCampaigns;

    const response = await DELETE(
      authenticatedDeleteRequest(token, { campaignId: "cmp_stale" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ deleted: true, campaignId: "cmp_stale" });
    await expect(container.campaigns.getById("cmp_stale")).resolves.toBeNull();
  });

  it("rejects deletion for funded campaigns", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_funded",
      budgetCents: 100,
      destinationUrl: "https://example.com/",
    });
    const token = (container.auth as MockAuthProvider).mintToken("adv1");

    const response = await DELETE(
      authenticatedDeleteRequest(token, { campaignId: "cmp_funded" }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("campaign_has_budget");
    await expect(container.campaigns.getById("cmp_funded")).resolves.toMatchObject({
      budgetCents: 100,
    });
  });
});
