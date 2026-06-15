/**
 * Advertiser dashboard layout — auth gate and shell wrapper.
 */

import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/server/adapters/auth/nextauth-config";

import { AdvertiserDashboardShell } from "./advertiser-dashboard-shell";
import "../dashboard-role-switcher.css";
import "./advertiser-dashboard.css";

export const dynamic = "force-dynamic";

const SIGNIN_HREF = "/api/auth/signin?callbackUrl=%2Fdashboard%2Fadvertiser";

export default async function AdvertiserDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const user = session?.user;
  const userId = user
    ? ((user as { id?: string }).id ?? user.email ?? null)
    : null;

  if (userId === null || userId.length === 0) {
    redirect(SIGNIN_HREF);
  }

  return (
    <div className="adv-dash">
      <AdvertiserDashboardShell>{children}</AdvertiserDashboardShell>
    </div>
  );
}
