/**
 * `POST /api/payouts/withdraw` — cash out the signed-in developer's available
 * balance to their connected Stripe account.
 *
 * Thin HTTP adapter over the {@link withdrawBalance payout service}. It is:
 *   - CSRF-guarded ({@link assertSameOrigin}) — this moves real money and is
 *     authenticated by the session cookie, so cross-origin POSTs are rejected
 *     with `403` before any side effect.
 *   - Browser-session authenticated (NextAuth) → `401` when no session.
 * It then delegates the money logic to the service and maps the typed result:
 *
 *   - `403 forbidden_origin` — cross-origin / origin-less request (no payout).
 *   - `401` — no signed-in session (no payout).
 *   - `409 not_connected` — no connected account / payouts not enabled yet.
 *   - `422 below_minimum` — balance below the $5.00 minimum payout.
 *   - `200` — `{ paidOutCents, paidOutUsd, payoutId }`.
 */

import { formatCentsAsUsd } from "@spinshare/core";

import { auth } from "@/server/adapters/auth/nextauth-config";
import { getContainer } from "@/server/container";
import { assertSameOrigin } from "@/server/http/csrf";
import { withdrawBalance } from "@/server/payout-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  // 1. CSRF: reject cross-origin / origin-less requests before any side effect.
  const csrf = assertSameOrigin(request);
  if (csrf) {
    return csrf;
  }

  // 2. Authenticate via the browser session.
  const session = await auth();
  const developerId =
    (session?.user as { id?: string } | undefined)?.id ?? undefined;
  if (!session || !developerId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // 3. Delegate the money movement to the service and map the typed result.
  const { users, payouts } = getContainer();
  const result = await withdrawBalance({ users, payouts }, developerId);

  if (result.ok) {
    return Response.json(
      {
        paidOutCents: result.paidOutCents,
        paidOutUsd: formatCentsAsUsd(result.paidOutCents),
        payoutId: result.payoutId,
      },
      { status: 200 },
    );
  }
  return Response.json({ error: result.error }, { status: result.status });
}
