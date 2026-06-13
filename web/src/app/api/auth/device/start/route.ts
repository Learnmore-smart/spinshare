/**
 * `POST /api/auth/device/start` — begins a Device Authorization Grant.
 *
 * Delegates to the composition-root {@link AuthProvider.startDeviceFlow}
 * (`MockAuthProvider` locally, `NextAuthDeviceProvider` in production) and
 * returns the device-flow handle the client polls with. The shape mirrors the
 * design "API Contracts" for this endpoint: `deviceCode`, `userCode`,
 * `verificationUri`, `verificationUriComplete`, `intervalSec`, and
 * `expiresInSec` (300). Clients open `verificationUri?user_code=...` in the
 * system browser, then poll `POST /api/auth/device/token` (R4.1, R4.2).
 */

import { getContainer } from "@/server/container";

/** Always evaluate at request time; never statically cache. */
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const handle = await getContainer().auth.startDeviceFlow();
  return Response.json(handle, { status: 200 });
}
