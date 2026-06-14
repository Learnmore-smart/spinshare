"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";

interface Props {
  lastUpdatedDate: string;
}

/**
 * Client-side chrome for the Privacy Policy page — only the parts that
 * need translation (eyebrow, headline, last-updated, and bottom CTAs).
 * The article body stays as static English copy inside the server page.
 */
export function PrivacyPageChrome({ lastUpdatedDate }: Props) {
  const t = useT();
  return (
    <>
      <div className="mb-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          {t.privacy.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
          <span className="spinshare-hero-highlight-3d">{t.privacy.titlePrefix}</span>{" "}
          <span className="text-slate-950">{t.privacy.titleSuffix}</span>
        </h1>
        <p className="mt-3 text-sm font-semibold text-slate-500">
          {t.privacy.lastUpdated(lastUpdatedDate)}
        </p>
      </div>

      <div className="mt-16 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/terms"
          className="spinshare-btn-outline inline-flex h-11 items-center gap-2 px-5 text-sm"
        >
          {t.privacy.readTerms}
        </Link>
        <Link
          href="/"
          className="spinshare-btn-outline inline-flex h-11 items-center gap-2 px-5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.common.backToHome}
        </Link>
      </div>
    </>
  );
}
