/**
 * `/activate` — device-flow approval page (cyberpunk).
 *
 * Server component. Reads the `user_code` from the query string (the CLI /
 * extension open `verificationUriComplete = <host>/activate?user_code=...`),
 * resolves the current NextAuth session, and either:
 *   - prompts an unauthenticated visitor to sign in (returning here afterwards), or
 *   - renders the interactive {@link ActivateClient} so a signed-in developer can
 *     approve or deny the pending login.
 *
 * Identity is resolved server-side; the client only ever sends the user code +
 * decision to `POST /api/auth/device/approve`. Works in both `AUTH_MODE=mock`
 * (local test accounts) and `AUTH_MODE=oauth` (Google/GitHub).
 */

import Link from "next/link";

import { auth } from "@/server/adapters/auth/nextauth-config";
import { ActivateClient } from "./activate-client";

export const dynamic = "force-dynamic";

/** Extracts a single `user_code` value from the (possibly array) query param. */
function readUserCode(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: { user_code?: string | string[] };
}): Promise<React.JSX.Element> {
  const userCode = readUserCode(searchParams.user_code);
  const session = await auth();
  const sessionUser = session?.user as
    | { id?: string; email?: string | null }
    | undefined;
  const signedIn = typeof sessionUser?.id === "string";
  const email = typeof sessionUser?.email === "string" ? sessionUser.email : null;

  const callbackUrl = `/activate?user_code=${encodeURIComponent(userCode)}`;
  const signInHref = `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05060f] p-4 text-slate-100">
      {/* Neon grid + glow backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(34,211,238,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.5)_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-fuchsia-600/30 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/3 h-[360px] w-[520px] rounded-full bg-cyan-500/25 blur-[120px]"
      />

      <div className="relative z-10 w-full max-w-[460px]">
        <div className="mb-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-cyan-300/80">
            SpinShare
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white [text-shadow:0_0_18px_rgba(34,211,238,0.55)]">
            Device Authorization
          </h1>
        </div>

        <div className="rounded-2xl border border-cyan-400/30 bg-white/[0.03] p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)] backdrop-blur-sm sm:p-8">
          {signedIn ? (
            <ActivateClient initialUserCode={userCode} email={email} />
          ) : (
            <div className="space-y-5 text-center">
              <p className="text-sm font-medium leading-relaxed text-slate-300">
                A device wants to sign in to your SpinShare account
                {userCode ? (
                  <>
                    {" "}
                    with code{" "}
                    <span className="font-mono font-bold text-fuchsia-300">
                      {userCode}
                    </span>
                  </>
                ) : null}
                . Sign in first to review and approve it.
              </p>
              <Link
                href={signInHref}
                className="inline-flex w-full items-center justify-center rounded-lg border border-cyan-400/60 bg-cyan-400/10 px-4 py-3 text-sm font-bold uppercase tracking-wider text-cyan-200 transition-all hover:bg-cyan-400/20 hover:shadow-[0_0_24px_rgba(34,211,238,0.45)]"
              >
                Sign in to continue
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center font-mono text-[11px] leading-relaxed text-slate-500">
          Only approve a device you started signing in from your terminal or editor.
        </p>
      </div>
    </main>
  );
}
