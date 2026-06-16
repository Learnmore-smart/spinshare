/**
 * Advertiser dashboard route (`/dashboard/advertiser`, task 12.4).
 *
 * Server component that mints a bearer `Device_Auth_Token` for the session's
 * user id and passes it to the client dashboard. Auth is enforced by
 * `layout.tsx`.
 */

import { AdvertiserOverviewView } from "./advertiser-overview-view";

export const dynamic = "force-dynamic";

export default function AdvertiserDashboardPage() {
  return <AdvertiserOverviewView />;
}
