import { describe, expect, it } from "vitest";

import {
  buildConnectedAccountCreateParams,
  createConnectedAccount,
} from "./stripe-payout-gateway";
import {
  STRIPE_API_BASE_URL,
  STRIPE_API_VERSION,
} from "./stripe-config";

describe("buildConnectedAccountCreateParams", () => {
  it("uses Accounts v2 recipient configuration without legacy account fields", () => {
    const params = buildConnectedAccountCreateParams({
      userId: "dev_123",
      email: "dev@example.com",
    });

    expect(params).toMatchObject({
      contact_email: "dev@example.com",
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
      dashboard: "express",
      defaults: {
        currency: "usd",
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
          requirements_collector: "stripe",
        },
      },
    });
    expect(params).not.toHaveProperty("type");
    expect(params).not.toHaveProperty("capabilities");
    expect(params).not.toHaveProperty("controller");
    expect(params).not.toHaveProperty("metadata");
  });
});

describe("createConnectedAccount", () => {
  it("posts the Accounts v2 payload with the pinned Stripe API version", async () => {
    let request: { input: string | URL | Request; init?: RequestInit } | undefined;
    const fetchImpl = async (
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      request = { input, init };
      return new Response(JSON.stringify({ id: "acct_v2_123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const params = buildConnectedAccountCreateParams({
      userId: "dev_123",
      email: "dev@example.com",
    });
    await expect(
      createConnectedAccount("sk_test_123", params, fetchImpl),
    ).resolves.toEqual({ id: "acct_v2_123" });

    expect(request?.input).toBe(`${STRIPE_API_BASE_URL}/v2/core/accounts`);
    expect(request?.init?.method).toBe("POST");
    expect(request?.init?.headers).toMatchObject({
      authorization: "Bearer sk_test_123",
      "content-type": "application/json",
      "stripe-version": STRIPE_API_VERSION,
    });
    expect(JSON.parse(String(request?.init?.body))).toEqual(params);
  });
});
