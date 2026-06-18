import { timingSafeEqual } from "node:crypto";

import { getContainer } from "@/server/container";
import { runFlushCycle } from "@/server/flush-service";

export const dynamic = "force-dynamic";

const BEARER_PREFIX = "Bearer ";

function configuredSecret(): string | null {
  const secret = (process.env.SPINSHARE_FLUSH_SECRET ?? process.env.CRON_SECRET ?? "").trim();
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
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

function flushSecretNotConfigured(): Response {
  return Response.json(
    { error: "flush_secret_not_configured" },
    { status: 503 },
  );
}

export async function POST(request: Request): Promise<Response> {
  const secret = configuredSecret();
  if (secret === null) {
    return flushSecretNotConfigured();
  }

  const token = bearerToken(request);
  if (token === null || !sameSecret(token, secret)) {
    return unauthorized();
  }

  try {
    const { counters, ledger, users, campaigns } = getContainer();
    const result = await runFlushCycle({ counters, ledger, users, campaigns });
    if (!result.flushed) {
      return Response.json(
        {
          error: "flush_failed",
          drained: result.drained,
          flushed: false,
          batchToken: result.batchToken,
        },
        { status: 500 },
      );
    }

    return Response.json(
      {
        drained: result.drained,
        flushed: result.flushed,
        batchToken: result.batchToken,
        balanceDeltaCentsByUser: result.balanceDeltaCentsByUser,
        budgetDeltaCentsByCampaign: result.budgetDeltaCentsByCampaign,
      },
      { status: 200 },
    );
  } catch {
    return Response.json({ error: "flush_failed" }, { status: 500 });
  }
}
