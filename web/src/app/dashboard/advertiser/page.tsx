/**
 * Advertiser dashboard route (`/dashboard/advertiser`, task 12.4).
 *
 * Server component that mints a bearer `Device_Auth_Token` for the session's
 * user id and passes it to the client dashboard. Auth is enforced by
 * `layout.tsx`.
 */

import { auth } from "@/server/adapters/auth/nextauth-config";
import { getContainer } from "@/server/container";

import { AdvertiserDashboard } from "./advertiser-dashboard";

export const dynamic = "force-dynamic";

interface TokenMinter {
  mintToken(userId: string): string;
}

function mintAdvertiserToken(userId: string): string {
  const { auth: provider } = getContainer();
  return (provider as unknown as TokenMinter).mintToken(userId);
}

export default async function AdvertiserDashboardPage() {
  const session = await auth();
  const user = session?.user;
  const userId = user
    ? ((user as { id?: string }).id ?? user.email ?? "")
    : "";

  const token = mintAdvertiserToken(userId);
  return <AdvertiserDashboard token={token} />;
}
