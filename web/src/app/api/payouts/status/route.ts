/**
 * `GET /api/payouts/status` — payout onboarding status for the signed-in
 * developer.
 *
 * Browser-session authenticated (NextAuth). Reports whether the developer has
 * a connected account and whether Stripe has cleared it to receive payouts,
 * refreshing the cached `payoutsEnabled` flag from Stripe when an account
 * exists. Also returns the durable available balance (cents) so the dashboard
 * can decide whether a cash-out is possible.
 *
 *   - `401` — no signed-in session.
 *   - `200` — `{ connected, payoutsEnabled, detailsSubmitted, balanceCents }`.
 */

import { auth } from "@/server/adapters/auth/nextauth-config";
import { getContainer } from "@/server/container";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const session = await auth();
  const developerId =
    (session?.user as { id?: string } | undefined)?.id ?? undefined;
  if (!session || !developerId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { users, payouts } = getContainer();
  const user = await users.getById(developerId);
  const balanceCents = user?.balanceCents ?? 0;

  if (!user?.stripeConnectAccountId) {
    return Response.json(
      {
        connected: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        balanceCents,
      },
      { status: 200 },
    );
  }

  // Refresh eligibility from Stripe and persist any change.
  const status = await payouts.getAccountStatus(user.stripeConnectAccountId);
  if (status.payoutsEnabled !== (user.payoutsEnabled ?? false)) {
    await users.setConnectAccount(developerId, {
      stripeConnectAccountId: user.stripeConnectAccountId,
      payoutsEnabled: status.payoutsEnabled,
    });
  }

  return Response.json(
    {
      connected: true,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      balanceCents,
    },
    { status: 200 },
  );
}
