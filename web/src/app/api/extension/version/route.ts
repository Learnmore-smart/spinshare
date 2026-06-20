/**
 * `GET /api/extension/version` — latest-release manifest for the editor extension.
 *
 * The SpinShare extension ships as a sideloaded `.vsix`, so the editor's own
 * Marketplace auto-update never runs. The extension's self-updater polls this
 * endpoint, compares {@link LATEST_EXTENSION_VERSION} against the running
 * extension version, and reinstalls the VSIX when this endpoint advertises a
 * newer one.
 *
 * The response is intentionally tiny and uncached (`no-store`) so a freshly
 * deployed version is picked up on the next poll. `url` is resolved against the
 * request origin, so the same handler serves the production host and a local
 * `http://localhost:3000` dev build (and the local flavor) without
 * configuration — each extension updates from the host it is pointed at.
 */

import {
  EXTENSION_VSIX_PATH,
  LATEST_EXTENSION_VERSION,
} from "@/lib/extension-release";

/** Always evaluate at request time so the origin and version are current. */
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const url = new URL(EXTENSION_VSIX_PATH, request.url).toString();

  return Response.json(
    { version: LATEST_EXTENSION_VERSION, url },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
