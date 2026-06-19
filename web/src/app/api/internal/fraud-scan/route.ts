/**
 * `POST /api/internal/fraud-scan` — periodic cross-entity collusion scan
 * (anti-fraud Tier 2c). Authenticated like the flush cron (a shared secret),
 * loads recent impression activity, and clusters account farms via shared-IP
 * fan-out. Returns the flagged clusters for review.
 *
 * Report-only by default (surfaces farms for human review). Pass `enforce: true`
 * in the JSON body to additionally claw back the flagged developers' still-held
 * earnings via the Tier 3a earnings-hold (`voidHeldEarnings`) — the decisive
 * action. Run it on an interval STRICTLY shorter than the earnings-hold
 * maturation window so flagged earnings are voided before they mature into a
 * withdrawable balance (see {@link EARNINGS_HOLD_WINDOW_SECONDS}).
 */

import { timingSafeEqual } from "node:crypto";

import { IP_FANOUT_WINDOW_SECONDS } from "@spinshare/core";
import { getContainer } from "@/server/container";
import { scanForCollusion } from "@/server/collusion-scan-service";

export const dynamic = "force-dynamic";

const BEARER_PREFIX = "Bearer ";

function configuredSecret(): string | null {
  const secret = (
    process.env.SPINSHARE_FRAUD_SCAN_SECRET ??
    process.env.SPINSHARE_FLUSH_SECRET ??
    process.env.CRON_SECRET ??
    ""
  ).trim();
  return secret.length > 0 ? secret : null;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

function sameSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  const secret = configuredSecret();
  if (secret === null) {
    return Response.json(
      { error: "fraud_scan_secret_not_configured" },
      { status: 503 },
    );
  }
  const token = bearerToken(request);
  if (token === null || !sameSecret(token, secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const enforce = await wantsEnforcement(request);

  try {
    const { activities, users } = getContainer();
    const nowMs = Date.now();
    const sinceMs = nowMs - IP_FANOUT_WINDOW_SECONDS * 1000;
    const recent = await activities.listRecentImpressions(sinceMs);
    const result = scanForCollusion({ activities: recent });

    let voidedCents = 0;
    const voidedByDeveloper: Record<string, number> = {};
    if (enforce) {
      for (const developerId of result.flaggedDeveloperIds) {
        // Claw back only still-held (un-matured) earnings. Earnings that
        // already matured survived the hold window and are out of reach here.
        const voided = await users.voidHeldEarnings(developerId, nowMs);
        if (voided > 0) {
          voidedByDeveloper[developerId] = voided;
          voidedCents += voided;
        }
      }
    }

    return Response.json(
      {
        scanned: recent.length,
        flaggedClusters: result.clusters.length,
        flaggedDevelopers: result.flaggedDeveloperIds.length,
        clusters: result.clusters,
        enforced: enforce,
        voidedCents,
        ...(enforce ? { voidedByDeveloper } : {}),
      },
      { status: 200 },
    );
  } catch {
    return Response.json({ error: "fraud_scan_failed" }, { status: 500 });
  }
}

/** Reads the `enforce` flag from the JSON body (absent/invalid ⇒ report-only). */
async function wantsEnforcement(request: Request): Promise<boolean> {
  try {
    const body = (await request.json()) as { enforce?: unknown };
    return body?.enforce === true;
  } catch {
    return false;
  }
}
