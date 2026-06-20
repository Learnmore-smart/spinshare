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
 *   - `503 withdrawals_disabled` — cash-outs are turned off platform-wide
 *     ({@link PAYOUT_WITHDRAWALS_ENABLED}) while Stripe payouts are not live yet;
 *     developers can still connect, but no money can leave.
 *   - `403 forbidden_origin` — cross-origin / origin-less request (no payout).
 *   - `401` — no signed-in session (no payout).
 *   - `409 not_connected` — no connected account / payouts not enabled yet.
 *   - `422 below_minimum` — balance below the $10.00 minimum payout.
 *   - `200` — `{ paidOutCents, paidOutUsd, payoutId }`.
 */

import { formatCentsAsUsd, PAYOUT_WITHDRAWALS_ENABLED } from "@spinshare/core";

import { auth } from "@/server/adapters/auth/nextauth-config";
import { getContainer } from "@/server/container";
import { assertSameOrigin } from "@/server/http/csrf";
import { withdrawBalance } from "@/server/payout-service";
import { buildPayoutRiskAssessor } from "@/server/payout-risk-service";
import type { ActivityRepository, DeveloperActivity } from "@/server/ports";

export const dynamic = "force-dynamic";

function providerFailureBody(error: unknown): Record<string, unknown> {
  const stripeError = error as
    | {
        requestId?: unknown;
        statusCode?: unknown;
        code?: unknown;
      }
    | undefined;

  return {
    error: "payout_withdraw_failed",
    message:
      "Stripe Connect rejected the payout transfer. Check the request id in Stripe logs.",
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

function payoutActivityId(
  status: DeveloperActivity["status"],
  developerId: string,
  stableId?: string,
): string {
  const statusSlug =
    status === "payoutPaid"
      ? "paid"
      : status === "payoutFailed"
        ? "failed"
        : "blocked";
  if (stableId !== undefined && stableId.trim().length > 0) {
    return `payout_${statusSlug}_${stableId}`;
  }
  const suffix =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${developerId}`;
  return `payout_${statusSlug}_${suffix}`;
}

async function recordPayoutActivity(
  activities: ActivityRepository,
  activity: DeveloperActivity,
): Promise<void> {
  try {
    await activities.record(activity);
  } catch (error) {
    console.warn("[spinshare] payout activity record failed", error);
  }
}

export async function POST(request: Request): Promise<Response> {
  // 1. CSRF: reject cross-origin / origin-less requests before any side effect.
  const csrf = assertSameOrigin(request);
  if (csrf) {
    return csrf;
  }

  // 2. Kill switch: cash-outs are disabled platform-wide until Stripe payouts go
  // live. Developers can still connect an account, but no money can leave yet.
  if (!PAYOUT_WITHDRAWALS_ENABLED) {
    return Response.json({ error: "withdrawals_disabled" }, { status: 503 });
  }

  // 3. Authenticate via the browser session.
  const session = await auth();
  const developerId =
    (session?.user as { id?: string } | undefined)?.id ?? undefined;
  if (!session || !developerId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // 4. Delegate the money movement to the service and map the typed result.
  const { users, payouts, payoutAttempts, activities } = getContainer();
  const assessRisk = buildPayoutRiskAssessor({ activities });
  let result: Awaited<ReturnType<typeof withdrawBalance>>;
  try {
    result = await withdrawBalance(
      { users, payouts, payoutAttempts, assessRisk },
      developerId,
    );
  } catch (error) {
    const body = providerFailureBody(error);
    const requestId =
      typeof body.requestId === "string" ? body.requestId : undefined;
    await recordPayoutActivity(activities, {
      activityId: payoutActivityId("payoutFailed", developerId, requestId),
      campaignId: "payout",
      type: "developer_event",
      status: "payoutFailed",
      developerId,
      ...(requestId !== undefined ? { providerEventId: requestId } : {}),
      ...(typeof body.providerStatus === "number"
        ? { providerStatus: body.providerStatus }
        : {}),
      ...(typeof body.providerCode === "string"
        ? { providerCode: body.providerCode }
        : {}),
      createdAtMs: Date.now(),
    });
    console.error(
      "[spinshare] payout withdraw failed",
      body,
    );
    return Response.json(body, { status: 502 });
  }

  if (result.ok) {
    await recordPayoutActivity(activities, {
      activityId: payoutActivityId(
        "payoutPaid",
        developerId,
        result.payoutId,
      ),
      campaignId: "payout",
      type: "developer_event",
      status: "payoutPaid",
      developerId,
      amountCents: result.paidOutCents,
      amountUsd: formatCentsAsUsd(result.paidOutCents),
      providerEventId: result.payoutId,
      createdAtMs: Date.now(),
    });
    return Response.json(
      {
        paidOutCents: result.paidOutCents,
        paidOutUsd: formatCentsAsUsd(result.paidOutCents),
        payoutId: result.payoutId,
      },
      { status: 200 },
    );
  }
  await recordPayoutActivity(activities, {
    activityId: payoutActivityId("payoutBlocked", developerId),
    campaignId: "payout",
    type: "developer_event",
    status: "payoutBlocked",
    developerId,
    providerCode: result.error,
    createdAtMs: Date.now(),
  });
  return Response.json({ error: result.error }, { status: result.status });
}
