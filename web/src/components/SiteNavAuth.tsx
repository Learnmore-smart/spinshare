"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { useT } from "@/lib/i18n/locale-provider";

const DEVELOPER_DASHBOARD_HREF = "/dashboard/developer";
const DEVELOPER_SIGNIN_HREF =
  "/signin?role=developer&callbackUrl=%2Fdashboard%2Fdeveloper";

function MoneyIcon() {
  return (
    <span aria-label="money" role="img" className="inline-grid place-items-center leading-none">
      🤑
    </span>
  );
}

export interface SiteNavAuthProps {
  /** Landing nav shows install CTA; dashboard nav is slimmer. */
  variant?: "landing" | "dashboard";
}

/**
 * Auth-aware navbar actions. When a session cookie is present (NextAuth JWT),
 * shows dashboard link and sign out — otherwise sign-in CTAs.
 */
export function SiteNavAuth({ variant = "landing" }: SiteNavAuthProps) {
  const t = useT();
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const email = session?.user?.email ?? null;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex h-9 items-center px-3 text-xs font-bold text-slate-400">
          …
        </span>
      </div>
    );
  }

  if (email && userId) {
    return (
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href={DEVELOPER_DASHBOARD_HREF}
          className="spinshare-btn-outline inline-flex h-9 min-w-9 items-center justify-center gap-1.5 px-2.5 text-xs sm:px-3"
          aria-label={t.navAuth.dashboardAria}
        >
          <LayoutDashboard className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">{t.navAuth.dashboard}</span>
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="spinshare-btn-outline inline-flex h-9 min-w-9 items-center justify-center gap-1.5 px-2.5 text-xs sm:px-3"
          aria-label={t.navAuth.signOutAria}
        >
          <LogOut className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">{t.navAuth.signOut}</span>
        </button>
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <Link href={DEVELOPER_SIGNIN_HREF} className="spinshare-btn-primary inline-flex h-9 items-center px-3 text-xs">
        {t.navAuth.signIn}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/signin"
        className="spinshare-btn-outline inline-flex h-9 items-center px-2.5 text-xs sm:px-3"
      >
        {t.nav.userLogin}
      </Link>
      <Link
        href={DEVELOPER_SIGNIN_HREF}
        className="spinshare-btn-primary inline-flex h-9 items-center gap-1.5 px-3 text-xs sm:px-4"
      >
        <MoneyIcon />
        {t.nav.install}
      </Link>
    </div>
  );
}
