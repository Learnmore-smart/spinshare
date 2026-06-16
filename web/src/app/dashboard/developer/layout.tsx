/**
 * Developer dashboard layout — shared auth, ledger load, icon rail shell.
 *
 * Child routes:
 *   /dashboard/developer          — overview (balance, stats, caps, payout)
 *   /dashboard/developer/earnings — earnings chart
 *   /dashboard/developer/activity — impression activity ledger
 *   /dashboard/developer/settings  — theme, locale, account, sign out
 */

import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/server/adapters/auth/nextauth-config";
import { getContainer } from "@/server/container";

import { toActivityFeedRows } from "../activity-feed";
import { DashboardShell } from "./dashboard-shell";
import { DeveloperDashboardProvider } from "./developer-dashboard-data";
import { DeveloperDashboardError } from "./developer-dashboard-parts";
import { summarizeLedger } from "./summarize-ledger";
import "../dashboard-role-switcher.css";
import "./developer-dashboard.css";

export const dynamic = "force-dynamic";

const SIGN_IN_PATH = "/api/auth/signin?callbackUrl=%2Fdashboard%2Fdeveloper";

export default async function DeveloperDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const developerId =
    (session?.user as { id?: string } | undefined)?.id ?? undefined;

  if (!session || !developerId) {
    redirect(SIGN_IN_PATH);
  }

  const user = {
    email: session.user?.email ?? "—",
    userId: developerId,
  };

  try {
    const container = getContainer();
    const [entries, activityEntries] = await Promise.all([
      container.ledger.listByDeveloper(developerId),
      container.activities.listByDeveloper(developerId),
    ]);
    const summary = summarizeLedger(entries);
    const activities = toActivityFeedRows(activityEntries);

    return (
      <DeveloperDashboardProvider
        activities={activities}
        summary={summary}
        user={user}
      >
        <div className="dev-dash">
          <DashboardShell>{children}</DashboardShell>
        </div>
      </DeveloperDashboardProvider>
    );
  } catch (err) {
    console.error("[developer-dashboard] ledger load failed:", err);
    const devHint =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? `${err.message} If you just added Firebase secrets, restart \`pnpm dev\` and sign in again.`
        : undefined;
    return <DeveloperDashboardError message={devHint} />;
  }
}
