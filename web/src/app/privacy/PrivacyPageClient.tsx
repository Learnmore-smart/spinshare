"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SpinShareWordmark } from "@/components/SpinShareWordmark";
import { PrivacyBody } from "@/lib/i18n/legal/privacy";
import { useT } from "@/lib/i18n/locale-provider";

/**
 * Full client-side rendering of the Privacy Policy page so every visible
 * string (navbar, title, body section headers, CTAs) is reactive to the
 * active locale.
 */
export function PrivacyPageClient() {
  const t = useT();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="liquid-glass spinshare-static mx-auto mt-3 flex h-16 max-w-7xl items-center justify-between rounded-[20px] bg-white/55 px-4 backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(180%)] [-webkit-backdrop-filter:blur(24px)_saturate(180%)] sm:px-6">
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

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/#money" className="transition hover:text-emerald-700">
              {t.nav.money}
            </Link>
            <Link href="/#bid-market" className="transition hover:text-emerald-700">
              {t.nav.marketDepth}
            </Link>
            <Link href="/#how-it-pays" className="transition hover:text-emerald-700">
              {t.nav.howItPays}
            </Link>
            <Link
              href="/signin?role=advertiser"
              className="transition hover:text-emerald-700"
            >
              {t.nav.advertisers}
            </Link>
          </nav>

          <Link
            href="/"
            className="spinshare-btn-primary inline-flex h-10 items-center gap-2 px-5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.common.backToHome}
          </Link>
        </div>
      </header>

      <div className="min-h-screen bg-[linear-gradient(115deg,#e9f8ef_0%,#f3faf5_48%,#e1f5e9_100%)] text-slate-950">
        <main className="mx-auto max-w-3xl px-4 pt-28 pb-24 sm:px-6 sm:pt-32">
        <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            {t.privacy.eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            <span className="spinshare-hero-highlight-3d">{t.privacy.titlePrefix}</span>{" "}
            <span className="text-slate-950">{t.privacy.titleSuffix}</span>
          </h1>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            {t.privacy.lastUpdated("June 13, 2026")}
          </p>
        </div>

        <article className="space-y-10 text-[15px] leading-7 text-slate-700">
          <PrivacyBody />
        </article>
      </main>

      <SiteFooter />
    </div>
    </>
  );
}
