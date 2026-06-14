/**
 * `/activate` — device-flow approval page (emerald theme).
 *
 * Server component. Reads the `user_code` from the query string (the CLI /
 * extension open `verificationUriComplete = <host>/activate?user_code=...`),
 * resolves the current NextAuth session, and either:
 *   - prompts an unauthenticated visitor to sign in (returning here afterwards), or
 *   - renders the interactive {@link ActivateClient} so a signed-in developer can
 *     approve or deny the pending login.
 */

import { auth } from "@/server/adapters/auth/nextauth-config";
import { ActivatePageClient } from "./activate-page-client";

export const dynamic = "force-dynamic";

/** Extracts a single `user_code` value from the (possibly array) query param. */
function readUserCode(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ user_code?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const userCode = readUserCode(params.user_code);
  const session = await auth();
  const sessionUser = session?.user as
    | { id?: string; email?: string | null }
    | undefined;
  const signedIn = typeof sessionUser?.id === "string";
  const email = typeof sessionUser?.email === "string" ? sessionUser.email : null;

  const callbackUrl = `/activate?user_code=${encodeURIComponent(userCode)}`;
  const signInHref = `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <ActivatePageClient
      userCode={userCode}
      signedIn={signedIn}
      email={email}
      signInHref={signInHref}
    />
  );
}
