/**
 * Custom 404 page — smooth, on-brand not-found experience.
 */

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(115deg,#e9f8ef_0%,#f3faf5_48%,#e1f5e9_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(16,185,129,0.18),transparent_31%),radial-gradient(circle_at_88%_14%,rgba(52,211,153,0.16),transparent_36%)]" />

      <div className="pointer-events-none absolute left-[10%] top-[20%] h-[400px] w-[400px] rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[15%] right-[10%] h-[350px] w-[350px] rounded-full bg-emerald-300/20 blur-3xl" />

      {/* Top navbar — kept on top, no ticker (not-found has no market data) */}
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
            <span className="text-xl font-black tracking-tight">SpinShare</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/#money" className="transition hover:text-emerald-700">
              Money
            </Link>
            <Link href="/#bid-market" className="transition hover:text-emerald-700">
              Market depth
            </Link>
            <Link href="/#how-it-pays" className="transition hover:text-emerald-700">
              How it pays
            </Link>
            <Link
              href="/signin?role=advertiser"
              className="transition hover:text-emerald-700"
            >
              Advertisers
            </Link>
          </nav>

          <Link
            href="/"
            className="spinshare-btn-primary inline-flex h-10 items-center gap-2 px-5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center px-4 pt-12 pb-16 text-center">
        <h1 className="spinshare-404-3d text-[8rem] font-black leading-none tracking-tighter sm:text-[12rem] lg:text-[16rem]">
          404
        </h1>

        <p className="mx-auto mt-6 max-w-md text-lg font-bold text-slate-700">
          This page doesn&apos;t exist
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-slate-500">
          The page you&apos;re looking for may have been moved or is no longer available.
        </p>

        <Link
          href="/"
          className="spinshare-btn-primary mt-8 inline-flex h-12 items-center gap-2 px-6 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
