/**
 * Internal dev console — `/dev`.
 *
 * Localhost: tools + analytics without auth.
 * Production: stealth 404 unless the signed-in user is an internal admin.
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { auth } from "@/server/adapters/auth/nextauth-config";
import { getContainer } from "@/server/container";
import { flushPendingForRead } from "@/server/flush-before-read";
import { isInternalAdminEmail } from "@/server/internal-admin";
import { loadPlatformStats } from "@/server/platform-stats";

import DevShell from "./dev-shell";

export const dynamic = "force-dynamic";

function isLocalhost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export default async function DevPage() {
  const headersList = await headers();
  const host = headersList.get("host");
  const isLocal = isLocalhost(host);

  if (!isLocal) {
    const session = await auth();
    if (!isInternalAdminEmail(session?.user?.email)) {
      notFound();
    }
  }

  const container = getContainer();
  await flushPendingForRead(container, "internal-dev-analytics");
  const stats = await loadPlatformStats({
    users: container.users,
    campaigns: container.campaigns,
    ledger: container.ledger,
  });

  return <DevShell isLocal={isLocal} stats={stats} />;
}
