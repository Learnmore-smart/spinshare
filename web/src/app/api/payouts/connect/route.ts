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

import { auth } from "@/server/adapters/auth/nextauth-config";
import { getContainer } from "@/server/container";
import { assertSameOrigin } from "@/server/http/csrf";

export const dynamic = "force-dynamic";

const DASHBOARD_PATH = "/dashboard/developer";

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

  const { users, payouts } = getContainer();
  const user = await users.getById(developerId);
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
}
