/**
 * Advertiser dashboard layout — auth gate and shell wrapper.
 */

import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/server/adapters/auth/nextauth-config";
import { getContainer } from "@/server/container";

import { AdvertiserDashboardShell } from "./advertiser-dashboard-shell";
import { AdvertiserDashboardProviderClient } from "./advertiser-dashboard-context";
import "../dashboard-role-switcher.css";
import "./advertiser-dashboard.css";

export const dynamic = "force-dynamic";

const SIGNIN_HREF = "/api/auth/signin?callbackUrl=%2Fdashboard%2Fadvertiser";

interface TokenMinter {
  mintToken(
    userId: string,
    claims?: { email?: string; role?: "advertiser" },
  ): string;
}

function mintAdvertiserToken(userId: string, email?: string | null): string {
  const { auth: provider } = getContainer();
  const trimmedEmail = email?.trim();
  return (provider as unknown as TokenMinter).mintToken(userId, {
    ...(trimmedEmail ? { email: trimmedEmail } : {}),
    role: "advertiser",
  });
}

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

  const token = mintAdvertiserToken(userId, user?.email);

  return (
    <div className="adv-dash">
      <AdvertiserDashboardProviderClient token={token}>
        <AdvertiserDashboardShell>{children}</AdvertiserDashboardShell>
      </AdvertiserDashboardProviderClient>
    </div>
  );
}
