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
import { flushPendingForRead } from "@/server/flush-before-read";
import { grantSignupBonus } from "@/server/signup-bonus-service";

import { DashboardShell } from "./dashboard-shell";
import { DeveloperActivityProviderClient } from "./developer-activity-context";
import { DeveloperDashboardProvider } from "./developer-dashboard-data";
import { DeveloperDashboardError } from "./developer-dashboard-parts";
import { summarizeLedger } from "./summarize-ledger";
import { welcomeGiftActivityFromRows } from "./welcome-gift-activity";
import "../dashboard-role-switcher.css";
import "./developer-dashboard.css";

export const dynamic = "force-dynamic";

const SIGN_IN_PATH = "/api/auth/signin?callbackUrl=%2Fdashboard%2Fdeveloper";

interface TokenMinter {
  mintToken(
    userId: string,
    claims?: { email?: string; role?: "developer" },
  ): string;
}

function mintDeveloperToken(userId: string, email?: string | null): string {
  const { auth: provider } = getContainer();
  const trimmedEmail = email?.trim();
  return (provider as unknown as TokenMinter).mintToken(userId, {
    ...(trimmedEmail ? { email: trimmedEmail } : {}),
    role: "developer",
  });
}

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
  const token = mintDeveloperToken(developerId, session.user?.email);

  try {
    const container = getContainer();
    await flushPendingForRead(container, "developer-dashboard");
    await grantSignupBonus(
      { ledger: container.ledger, users: container.users },
      developerId,
    );
    const entries = await container.ledger.listByDeveloper(developerId);
    const summary = summarizeLedger(entries);
    const welcomeGiftActivity = welcomeGiftActivityFromRows(summary.rows);

    return (
      <DeveloperDashboardProvider
        activities={[]}
        summary={summary}
        user={user}
      >
        <DeveloperActivityProviderClient
          token={token}
          pinnedActivities={welcomeGiftActivity ? [welcomeGiftActivity] : []}
        >
          <div className="dev-dash">
            <DashboardShell>{children}</DashboardShell>
          </div>
        </DeveloperActivityProviderClient>
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
