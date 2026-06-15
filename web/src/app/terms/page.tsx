"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SpinShareWordmark } from "@/components/SpinShareWordmark";
import { TermsArticle } from "@/lib/i18n/legal/terms";
import { useT } from "@/lib/i18n/locale-provider";

export default function TermsPage() {
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
            {t.terms.eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            <span className="spinshare-hero-highlight-3d">{t.terms.titlePrefix}</span>{" "}
            <span className="text-slate-950">{t.terms.titleSuffix}</span>
          </h1>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            {t.terms.lastUpdated("June 13, 2026")}
          </p>
          <p className="mt-4 rounded-xl border border-emerald-100 bg-white/60 p-4 text-sm leading-6 text-slate-700">
            {t.terms.introBanner}
          </p>
        </div>

        <nav
          aria-label="Table of contents"
          className="mb-10 rounded-2xl border border-emerald-100 bg-white/55 p-5 text-sm"
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            {t.terms.contents}
          </p>
          <ol className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {Array.from({ length: 22 }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <a
                  href={`#section-${n}`}
                  className="font-semibold text-slate-600 transition hover:text-emerald-700"
                >
                  {n}.{" "}
                  {t.terms.sectionTitles[n] ?? ""}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <TermsArticle />

        <div className="mt-16 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/privacy"
            className="spinshare-btn-outline inline-flex h-11 items-center gap-2 px-5 text-sm"
          >
            {t.terms.readPrivacy}
          </Link>
          <Link
            href="/"
            className="spinshare-btn-outline inline-flex h-11 items-center gap-2 px-5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.common.backToHome}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
    </>
  );
}