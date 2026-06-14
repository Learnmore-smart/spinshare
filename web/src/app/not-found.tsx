/**
 * Custom 404 page — smooth, on-brand not-found experience.
 */

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(115deg,#e9f8ef_0%,#f3faf5_48%,#e1f5e9_100%)] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(16,185,129,0.18),transparent_31%),radial-gradient(circle_at_88%_14%,rgba(52,211,153,0.16),transparent_36%)]" />

      <div className="pointer-events-none absolute left-[10%] top-[20%] h-[400px] w-[400px] rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[15%] right-[10%] h-[350px] w-[350px] rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative z-10 text-center">
        <Link href="/" className="mb-8 inline-flex items-center gap-3" aria-label="SpinShare home">
          <Image
            src="/logo/spinshare-logo.png"
            alt="SpinShare Logo"
            width={48}
            height={48}
            className="h-12 w-12 rounded-[10px] object-contain shadow-[0_10px_24px_rgba(22,163,74,0.24)]"
          />
          <span className="text-2xl font-black tracking-tight text-slate-950">
            SpinShare
          </span>
        </Link>

        <h1 className="mt-8 text-[8rem] font-black leading-none tracking-tighter text-slate-950/10 sm:text-[10rem]">
          404
        </h1>

        <p className="mx-auto mt-4 max-w-md text-lg font-bold text-slate-700">
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
