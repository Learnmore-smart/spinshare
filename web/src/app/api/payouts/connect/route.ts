/**
 * `POST /api/payouts/connect` — start (or resume) Stripe Connect payout
 * onboarding for the signed-in developer.
 *
 * Browser-session authenticated (NextAuth), since it backs the developer
 * dashboard's "Connect payouts" button. Resolves the developer from the
 * session, ensures a Stripe Express connected account exists (reusing the
 * stored one when present), persists the account id, and returns a hosted
 * onboarding `url` the dashboard redirects to.
 *
 *   - `401` — no signed-in session (no account created).
 *   - `200` — `{ url }` to Stripe (or, in mock mode, straight back to the
 *     dashboard with `?payouts=connected`).
 *
 * See the `PayoutGateway` port and design "Provider Abstraction Layer (Ports)".
 */

import { MINIMUM_PAYOUT_CENTS } from "@spinshare/core";

import { auth } from "@/server/adapters/auth/nextauth-config";
import { getContainer } from "@/server/container";
import { flushPendingForRead } from "@/server/flush-before-read";
import { assertSameOrigin } from "@/server/http/csrf";

export const dynamic = "force-dynamic";

const DASHBOARD_PATH = "/dashboard/developer";
const GENERIC_PROVIDER_FAILURE_MESSAGE =
  "Stripe Connect rejected the payout onboarding request. Check the request id in Stripe logs.";
const CONNECT_NOT_ENABLED_MESSAGE =
  "Stripe Connect is not enabled for this Stripe account. Enable Connect in Stripe Dashboard, then retry.";
const CONNECT_SETUP_BLOCKER_CODES = new Set([
  "account_create_activation_required",
  "connect_identity_not_verified",
  "connect_profile_not_submitted",
  "platform_registration_required",
]);

function isConnectSetupBlocker(
  stripeError:
    | {
        code?: unknown;
        message?: unknown;
      }
    | undefined,
): boolean {
  if (typeof stripeError?.code === "string") {
    if (CONNECT_SETUP_BLOCKER_CODES.has(stripeError.code)) return true;
  }

  return (
    typeof stripeError?.message === "string" &&
    stripeError.message.includes("signed up for Connect")
  );
}

function providerFailureBody(error: unknown): Record<string, unknown> {
  const stripeError = error as
    | {
        requestId?: unknown;
        statusCode?: unknown;
        code?: unknown;
        type?: unknown;
        rawType?: unknown;
        message?: unknown;
      }
    | undefined;
  const setupBlocked = isConnectSetupBlocker(stripeError);

  return {
    error: "payout_connect_failed",
    ...(setupBlocked ? { reason: "stripe_connect_not_enabled" } : {}),
    message: setupBlocked
      ? CONNECT_NOT_ENABLED_MESSAGE
      : GENERIC_PROVIDER_FAILURE_MESSAGE,
    ...(typeof stripeError?.requestId === "string"
      ? { requestId: stripeError.requestId }
      : {}),
    ...(typeof stripeError?.statusCode === "number"
      ? { providerStatus: stripeError.statusCode }
      : {}),
    ...(typeof stripeError?.code === "string"
      ? { providerCode: stripeError.code }
      : {}),
  };
}

export async function POST(request: Request): Promise<Response> {
  // CSRF: this creates a Stripe account + onboarding link off a session cookie,
  // so reject cross-origin / origin-less requests before any side effect.
  const csrf = assertSameOrigin(request);
  if (csrf) {
    return csrf;
  }

  const session = await auth();
  const developerId =
    (session?.user as { id?: string } | undefined)?.id ?? undefined;
  if (!session || !developerId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const container = getContainer();
    await flushPendingForRead(container, "payouts-connect");
    const { users, payouts } = container;
    const user = await users.getById(developerId);
    const balanceCents = user?.balanceCents ?? 0;
    if (balanceCents < MINIMUM_PAYOUT_CENTS) {
      return Response.json(
        {
          error: "below_minimum",
          balanceCents,
          minimumCents: MINIMUM_PAYOUT_CENTS,
        },
        { status: 422 },
      );
    }

    const email = user?.email ?? session.user?.email ?? undefined;

    // Create or reuse the developer's connected account, then persist its id.
    const { accountId } = await payouts.ensureConnectedAccount({
      userId: developerId,
      ...(email !== undefined ? { email } : {}),
      ...(user?.stripeConnectAccountId !== undefined
        ? { existingAccountId: user.stripeConnectAccountId }
        : {}),
    });
    await users.setConnectAccount(developerId, {
      stripeConnectAccountId: accountId,
      payoutsEnabled: user?.payoutsEnabled ?? false,
    });

    const origin = new URL(request.url).origin;
    const { url } = await payouts.createOnboardingLink({
      accountId,
      returnUrl: `${origin}${DASHBOARD_PATH}?payouts=connected`,
      refreshUrl: `${origin}${DASHBOARD_PATH}?payouts=refresh`,
    });

    return Response.json({ url }, { status: 200 });
  } catch (error) {
    console.error("[spinshare] payout connect failed", providerFailureBody(error));
    return Response.json(providerFailureBody(error), { status: 502 });
  }
}
