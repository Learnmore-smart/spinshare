/**
 * Dev page — `/dev` (localhost only).
 *
 * Provides one-click sign-in with test accounts and quick navigation to all
 * pages. Non-localhost visitors see the standard 404 page.
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import DevPageClient from "./dev-client";

export const dynamic = "force-dynamic";

function isLocalhost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export default async function DevPage() {
  const headersList = await headers();
  const host = headersList.get("host");

  if (!isLocalhost(host)) {
    notFound();
  }

  return <DevPageClient />;
}
