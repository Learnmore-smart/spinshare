/**
 * StripePayoutGateway — production {@link PayoutGateway} backed by Stripe
 * Connect (Express).
 *
 * Selected at the composition root when `STRIPE_MODE` is `test` or `live`
 * (local/test runs use {@link MockPayoutGateway}). Reads `STRIPE_SECRET_KEY`
 * from the environment, lazily, on first credentialed use — constructing the
 * gateway never touches Stripe, so builds/type-checks/module loads work without
 * keys (mirrors {@link StripeGateway}).
 *
 * Flow:
 *   - {@link ensureConnectedAccount} creates an Accounts v2 recipient account
 *     with Express dashboard access or reuses the developer's existing one.
 *   - {@link createOnboardingLink} creates an `account_onboarding` Account Link
 *     the dashboard redirects to.
 *   - {@link getAccountStatus} reads `payouts_enabled` / `details_submitted`.
 *   - {@link createPayout} moves the developer's earnings from the platform
 *     balance to the connected account via `transfers.create` (Stripe then pays
 *     out to the developer's bank per the account's payout schedule).
 *
 * See the `PayoutGateway` port and design "Provider Abstraction Layer (Ports)".
 */

import Stripe from "stripe";

import type {
  ConnectAccountStatus,
  EnsureConnectedAccountInput,
  OnboardingLinkInput,
  PayoutGateway,
  PayoutInput,
  PayoutResult,
} from "../../ports/payout-gateway";
import type { StripeGatewayEnv } from "./stripe-gateway";
import {
  createStripeClient,
  STRIPE_API_BASE_URL,
  STRIPE_API_VERSION,
} from "./stripe-config";

/**
 * Platform payout region — the single source of truth for the country and
 * currency every Connect account is created with. Centralized so the Accounts
 * v2 path (`identity.country`, lowercase) and the legacy fallback path
 * (`country`, uppercase) can never drift apart.
 *
 * The platform settles in USD and onboards **US** connected accounts only,
 * under Stripe's full terms of service — the path that works today. The
 * original `identity_country_required` failure came from omitting this country
 * on the Accounts v2 create call. Going international is deliberately deferred:
 * it means collecting the developer's country, restricting it to Stripe's
 * self-serve cross-border set (US/UK/EEA/CA/CH), branching US=full-ToS vs
 * non-US=recipient agreement, and letting non-US accounts settle in their local
 * currency. See `.ai/docs/payout-connect-country-fix.md`.
 */
const PAYOUT_COUNTRY = "US";

/** Platform settlement currency (amounts are US-dollar cents). */
const CURRENCY = "usd";

type FetchLike = typeof fetch;

interface StripeV2CoreAccountCreateParams {
  contact_email?: string;
  identity: {
    country: string;
  };
  configuration: {
    merchant: {
      capabilities: {
        card_payments: { requested: true };
      };
    };
    recipient: {
      capabilities: {
        stripe_balance: {
          stripe_transfers: { requested: true };
        };
      };
    };
  };
  dashboard: "express";
  defaults: {
    currency: typeof CURRENCY;
    responsibilities: {
      fees_collector: "application";
      losses_collector: "application";
    };
  };
  include: readonly [
    "configuration.merchant",
    "configuration.recipient",
    "defaults",
  ];
}

interface StripeV2CoreAccount {
  id: string;
}

class StripeV2RequestError extends Error {
  readonly statusCode: number;
  readonly requestId: string | null;
  readonly rawType: string | undefined;
  readonly code: string | undefined;

  constructor(response: Response, body: unknown) {
    const error =
      body && typeof body === "object" && "error" in body
        ? (body.error as Record<string, unknown>)
        : undefined;
    const message =
      typeof error?.message === "string"
        ? error.message
        : `Stripe Accounts v2 request failed with status ${response.status}`;

    super(message);
    this.name = "StripeV2RequestError";
    this.statusCode = response.status;
    this.requestId = response.headers.get("request-id");
    this.rawType = typeof error?.type === "string" ? error.type : undefined;
    this.code = typeof error?.code === "string" ? error.code : undefined;
  }
}

async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: { message: text } };
  }
}

export function buildConnectedAccountCreateParams(
  input: EnsureConnectedAccountInput,
): StripeV2CoreAccountCreateParams {
  return {
    ...(input.email !== undefined ? { contact_email: input.email } : {}),
    identity: {
      country: PAYOUT_COUNTRY.toLowerCase(),
    },
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { requested: true },
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
      currency: CURRENCY,
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
    },
    include: ["configuration.merchant", "configuration.recipient", "defaults"],
  };
}

export function buildLegacyConnectedAccountCreateParams(
  input: EnsureConnectedAccountInput,
): Stripe.AccountCreateParams {
  return {
    country: PAYOUT_COUNTRY,
    ...(input.email !== undefined ? { email: input.email } : {}),
    capabilities: {
      transfers: { requested: true },
    },
    controller: {
      fees: { payer: "application" },
      losses: { payments: "application" },
      requirement_collection: "stripe",
      stripe_dashboard: { type: "express" },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isAccountsV2UnavailableError(error: unknown): boolean {
  if (!isRecord(error)) return false;

  if (error.code === "non_connect_platform_accounts_v2_access_blocked") {
    return true;
  }

  return (
    error.statusCode === 404 &&
    typeof error.message === "string" &&
    error.message.includes("API method cannot be found")
  );
}

export async function createConnectedAccount(
  secretKey: string,
  params: StripeV2CoreAccountCreateParams,
  fetchImpl: FetchLike = fetch,
): Promise<StripeV2CoreAccount> {
  const response = await fetchImpl(`${STRIPE_API_BASE_URL}/v2/core/accounts`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/json",
      "stripe-version": STRIPE_API_VERSION,
    },
    body: JSON.stringify(params),
  });
  const body = await readJsonBody(response);

  if (!response.ok) {
    throw new StripeV2RequestError(response, body);
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("id" in body) ||
    typeof body.id !== "string"
  ) {
    throw new Error("Stripe Accounts v2 response did not include an account id");
  }

  return { id: body.id };
}

export class StripePayoutGateway implements PayoutGateway {
  /** Lazily-initialized Stripe client; absent until first credentialed use. */
  private client: Stripe | undefined;
  private secretKey: string | undefined;

  constructor(private readonly env: StripeGatewayEnv = process.env) {}

  /**
   * Returns the lazily-initialized Stripe client, creating it from
   * `STRIPE_SECRET_KEY` on first use. Throws a clear error when the key is
   * absent so misconfiguration surfaces at call time, never at import/build.
   */
  private getSecretKey(): string {
    if (this.secretKey === undefined) {
      this.secretKey = this.env.STRIPE_SECRET_KEY;
      if (this.secretKey === undefined || this.secretKey.length === 0) {
        throw new Error(
          "STRIPE_SECRET_KEY is not set. Provide it to manage Connect payouts, " +
            "or use STRIPE_MODE=mock for local development.",
        );
      }
    }
    return this.secretKey;
  }

  private getClient(): Stripe {
    if (this.client === undefined) {
      this.client = createStripeClient(this.getSecretKey());
    }
    return this.client;
  }

  async ensureConnectedAccount(
    input: EnsureConnectedAccountInput,
  ): Promise<{ accountId: string }> {
    if (input.existingAccountId && input.existingAccountId.length > 0) {
      return { accountId: input.existingAccountId };
    }
    const account = await createConnectedAccount(
      this.getSecretKey(),
      buildConnectedAccountCreateParams(input),
    ).catch(async (error: unknown) => {
      if (!isAccountsV2UnavailableError(error)) {
        throw error;
      }
      return this.getClient().accounts.create(
        buildLegacyConnectedAccountCreateParams(input),
      );
    });
    return { accountId: account.id };
  }

  async createOnboardingLink(
    input: OnboardingLinkInput,
  ): Promise<{ url: string }> {
    const client = this.getClient();
    const link = await client.accountLinks.create({
      account: input.accountId,
      return_url: input.returnUrl,
      refresh_url: input.refreshUrl,
      type: "account_onboarding",
      collection_options: { fields: "eventually_due" },
    });
    return { url: link.url };
  }

  async getAccountStatus(accountId: string): Promise<ConnectAccountStatus> {
    const client = this.getClient();
    const account = await client.accounts.retrieve(accountId);
    return {
      accountId,
      payoutsEnabled: account.payouts_enabled === true,
      detailsSubmitted: account.details_submitted === true,
    };
  }

  async createPayout(input: PayoutInput): Promise<PayoutResult> {
    const client = this.getClient();
    // Move funds from the platform balance to the connected account. Stripe then
    // pays the developer's bank per the account's payout schedule.
    const transfer = await client.transfers.create({
      amount: input.amountCents,
      currency: CURRENCY,
      destination: input.accountId,
    });
    return { payoutId: transfer.id, amountCents: input.amountCents };
  }
}
