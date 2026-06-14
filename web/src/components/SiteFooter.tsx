"use client";

import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useT } from "@/lib/i18n/locale-provider";

/**
 * Shared minimal footer used by the legal/utility pages (privacy, terms, 404).
 * The home page has its own richer footer with logo + tagline + nav links;
 * this one only carries the copyright + a language switcher so the user can
 * still flip language from any page.
 */
export function SiteFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-emerald-900/10 px-4 py-6 text-sm font-semibold text-slate-500 sm:px-6">
      <div className="liquid-glass mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 rounded-[20px] px-5 py-4 sm:flex-row">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          &copy; {year} SpinShare
        </p>
        <nav className="flex items-center gap-4 text-xs font-bold text-slate-500">
          <Link href="/privacy" className="transition hover:text-emerald-700">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-emerald-700">
            Terms
          </Link>
        </nav>
        <LanguageSwitcher />
      </div>
    </footer>
  );
}
