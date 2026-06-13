/**
 * Developer dashboard route — `/dashboard/developer` (Requirement 8).
 *
 * Server component responsible only for access control and data loading; all
 * presentation lives in the pure `summarizeLedger` + `DeveloperDashboardView`
 * pair so it stays testable from fixtures (task 12.5 / Property 25).
 *
 * Flow:
 *   1. Resolve the browser session via NextAuth `auth()`. An unauthenticated
 *      visitor is redirected into the auth flow (Requirement 8.4).
 *   2. Load the developer's durable ledger entries from the composition root.
 *   3. Summarize them and render the view. Any load failure renders the
 *      explicit error state rather than crashing (design "Error Handling").
 */

import { redirect } from "next/navigation";

import { auth } from "@/server/adapters/auth/nextauth-config";
import { getContainer } from "@/server/container";
import {
  DeveloperDashboardError,
  DeveloperDashboardView,
} from "./developer-dashboard-view";
import { summarizeLedger } from "./summarize-ledger";

// Session + ledger reads are per-request; never statically prerender.
export const dynamic = "force-dynamic";

/** Where unauthenticated visitors are sent to authenticate (Requirement 8.4). */
const SIGN_IN_PATH =
  "/api/auth/signin?callbackUrl=%2Fdashboard%2Fdeveloper";

export default async function DeveloperDashboardPage() {
  const session = await auth();
  const developerId =
    (session?.user as { id?: string } | undefined)?.id ?? undefined;

  // Requirement 8.4: redirect unauthenticated visitors to the auth flow.
  if (!developerId) {
    redirect(SIGN_IN_PATH);
  }

  try {
    const entries = await getContainer().ledger.listByDeveloper(developerId);
    const summary = summarizeLedger(entries);
    return <DeveloperDashboardView summary={summary} />;
  } catch {
    return <DeveloperDashboardError />;
  }
}
