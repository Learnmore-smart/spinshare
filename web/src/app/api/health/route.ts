/**
 * `GET /api/health` — readiness probe.
 *
 * Builds (or reuses) the composition-root {@link getContainer container} and
 * returns `200` with a small JSON body once the app is ready to serve requests.
 * The e2e harness polls this endpoint after starting the Next.js server in
 * `SPINSHARE_MODE=local`, failing if it does not become ready within the startup
 * timeout (design "`npm run test:e2e` design", R11.1/R11.8). If the container
 * cannot be wired (e.g. a misconfigured provider flag), it reports `503`.
 */

import { getContainer } from "@/server/container";

/** Always evaluate at request time; never statically cache the probe. */
export const dynamic = "force-dynamic";

export function GET(): Response {
  try {
    // Wiring the container exercises adapter selection; success means ready.
    getContainer();
    return Response.json(
      { status: "ok", service: "spinshare-web" },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json(
      { status: "error", error: message },
      { status: 503 },
    );
  }
}
