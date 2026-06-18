import { describe, expect, it } from "vitest";

import {
  buildLegacyConnectedAccountCreateParams,
  buildConnectedAccountCreateParams,
  createConnectedAccount,
  isAccountsV2UnavailableError,
} from "./stripe-payout-gateway";
import {
  STRIPE_API_BASE_URL,
  STRIPE_API_VERSION,
} from "./stripe-config";

describe("buildConnectedAccountCreateParams", () => {
  it("uses Accounts v2 merchant and recipient configuration without legacy account fields", () => {
    const params = buildConnectedAccountCreateParams({
      userId: "dev_123",
      email: "dev@example.com",
    });

    expect(params).toMatchObject({
      contact_email: "dev@example.com",
      identity: {
        country: "us",
      },
      configuration: {
        merchant: {
          capabilities: {
            card_payments: {
              requested: true,
            },
          },
        },
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
        },
      },
    });
    expect(params.include).toEqual([
      "configuration.merchant",
      "configuration.recipient",
      "defaults",
    ]);
    expect(params).not.toHaveProperty(
      "defaults.responsibilities.requirements_collector",
    );
    expect(params).not.toHaveProperty("type");
    expect(params).not.toHaveProperty("capabilities");
    expect(params).not.toHaveProperty("controller");
    expect(params).not.toHaveProperty("metadata");
  });

  it("derives the same payout country as the legacy fallback (single source)", () => {
    const v2 = buildConnectedAccountCreateParams({ userId: "dev_123" });
    const legacy = buildLegacyConnectedAccountCreateParams({ userId: "dev_123" });

    // Accounts v2 expects a lowercase ISO country; the legacy path uppercases
    // it. Both must derive from the one PAYOUT_COUNTRY constant so they can
    // never drift apart.
    expect(v2.identity.country).toBe(legacy.country?.toLowerCase());
    expect(v2.identity.country).toBe("us");
  });
});

describe("buildLegacyConnectedAccountCreateParams", () => {
  it("uses controller-based Express account fields without legacy type", () => {
    const params = buildLegacyConnectedAccountCreateParams({
      userId: "dev_123",
      email: "dev@example.com",
    });

    expect(params).toMatchObject({
      country: "US",
      email: "dev@example.com",
      capabilities: {
        transfers: { requested: true },
      },
      controller: {
        fees: { payer: "application" },
        losses: { payments: "application" },
        requirement_collection: "stripe",
        stripe_dashboard: { type: "express" },
      },
    });
    expect(params).not.toHaveProperty("type");
    expect(params).not.toHaveProperty("metadata");
  });
});

describe("isAccountsV2UnavailableError", () => {
  it("matches Stripe signals that Accounts v2 cannot be used by this platform", () => {
    expect(
      isAccountsV2UnavailableError({
        code: "non_connect_platform_accounts_v2_access_blocked",
        statusCode: 400,
      }),
    ).toBe(true);
    expect(
      isAccountsV2UnavailableError({
        statusCode: 404,
        message: "API method cannot be found",
      }),
    ).toBe(true);
  });

  it("does not hide invalid Accounts v2 payload errors", () => {
    expect(
      isAccountsV2UnavailableError({
        code: "invalid_fields",
        statusCode: 400,
        message: "Unknown field defaults.responsibilities.requirements_collector",
      }),
    ).toBe(false);
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
