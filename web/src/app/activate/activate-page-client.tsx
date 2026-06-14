"use client";

/**
 * Client shell for `/activate` — device-flow approval page copy is locale-aware.
 */

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useT } from "@/lib/i18n/locale-provider";
import { SpinShareWordmark } from "@/components/SpinShareWordmark";
import { ActivateClient } from "./activate-client";
import "./activate.css";

export interface ActivatePageClientProps {
  userCode: string;
  signedIn: boolean;
  email: string | null;
  signInHref: string;
}

export function ActivatePageClient({
  userCode,
  signedIn,
  email,
  signInHref,
}: ActivatePageClientProps): React.JSX.Element {
  const t = useT();

  return (
    <div className="spinshare-activate-page relative min-h-screen overflow-hidden px-4 py-5 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(16,185,129,0.18),transparent_31%),radial-gradient(circle_at_88%_14%,rgba(52,211,153,0.16),transparent_36%)]"
      />

      <header className="relative z-20 mx-auto flex max-w-lg items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label="SpinShare home">
          <Image
            src="/logo/spinshare-logo.png"
            alt="SpinShare Logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-[8px] object-contain shadow-[0_10px_24px_rgba(22,163,74,0.24)]"
          />
          <SpinShareWordmark className="text-xl" />
        </Link>
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 text-sm font-black text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur transition hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.nav.home}
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-76px)] max-w-lg items-center justify-center py-10">
        <div className="w-full">
          <div className="mb-6 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-800/60">
              {t.activate.deviceAuth}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {t.activate.titlePrefix}{" "}
              <span className="spinshare-hero-highlight-3d">{t.activate.titleHighlight}</span>
            </h1>
          </div>

          <section className="spinshare-activate-card p-6 sm:p-8">
            {signedIn ? (
              <Suspense
                fallback={
                  <p className="text-center text-sm font-semibold text-slate-600">
                    {t.activate.approvingDevice}
                  </p>
                }
              >
                <ActivateClient initialUserCode={userCode} email={email} />
              </Suspense>
            ) : (
              <div className="space-y-5 text-center">
                <p className="text-sm font-semibold leading-relaxed text-slate-600">
                  {t.activate.signedOutBody(userCode || null)}
                </p>
                <Link
                  href={signInHref}
                  className="spinshare-btn-primary inline-flex min-h-12 w-full items-center justify-center rounded-[12px] text-sm"
                >
                  {t.activate.signInToContinue}
                </Link>
              </div>
            )}
          </section>

          <p className="mt-6 text-center text-xs font-semibold leading-relaxed text-slate-500">
            {t.activate.footerHint}
          </p>
        </div>
      </main>
    </div>
  );
}
