/**
 * Advertiser dashboard route (`/dashboard/advertiser`, task 12.4).
 *
 * Server component that gates access on an authenticated browser session: when
 * no session is present the visitor is redirected into the NextAuth sign-in
 * flow (the advertiser-dashboard analogue of R8.4's unauthenticated redirect).
 *
 * The dashboard's data calls (`/api/campaigns`, `/api/funds/checkout`) are
 * authenticated with a bearer `Device_Auth_Token`, so we mint one for the
 * session's user id here — using the same {@link AuthProvider} the API routes
 * validate against (from the composition-root container) — and pass it to the
 * client component. This keeps the browser dashboard and the bearer-authced
 * HTTP API consistent without exposing any long-lived credential.
 */

import { redirect } from "next/navigation";

import { auth } from "@/server/adapters/auth/nextauth-config";
import { getContainer } from "@/server/container";

import { AdvertiserDashboard } from "./advertiser-dashboard";

/** Sessions are per-request; never statically cache this page. */
export const dynamic = "force-dynamic";

/** Where unauthenticated visitors are sent, returning here after sign-in. */
const SIGNIN_HREF = "/api/auth/signin?callbackUrl=%2Fdashboard%2Fadvertiser";

/**
 * Auth providers (`MockAuthProvider`, `NextAuthDeviceProvider`) both expose
 * `mintToken`, though it isn't part of the `AuthProvider` port. This narrow
 * structural type lets the server mint a session-scoped device token without
 * widening the shared port.
 */
interface TokenMinter {
  mintToken(userId: string): string;
}

/** Mints a bearer `Device_Auth_Token` for the resolved advertiser id. */
function mintAdvertiserToken(userId: string): string {
  const { auth: provider } = getContainer();
  return (provider as unknown as TokenMinter).mintToken(userId);
}

export default async function AdvertiserDashboardPage() {
  const session = await auth();
  const user = session?.user;
  const userId = user
    ? ((user as { id?: string }).id ?? user.email ?? null)
    : null;

  if (userId === null || userId.length === 0) {
    redirect(SIGNIN_HREF);
  }

  const token = mintAdvertiserToken(userId);
  return <AdvertiserDashboard token={token} />;
}
