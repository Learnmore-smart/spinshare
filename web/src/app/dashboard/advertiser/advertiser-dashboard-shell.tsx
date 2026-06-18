"use client";

import { useMemo, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, LayoutDashboard, Megaphone, ScrollText, Settings } from "lucide-react";

import { DashboardRoleSwitcher } from "@/components/DashboardRoleSwitcher";
import { useT } from "@/lib/i18n/locale-provider";

export interface AdvertiserDashboardShellProps {
  children: ReactNode;
}

const OVERVIEW_HREF = "/dashboard/advertiser";
const CAMPAIGNS_HREF = "/dashboard/advertiser/campaigns";
const ACTIVITY_HREF = "/dashboard/advertiser/activity";
const STATS_HREF = "/dashboard/advertiser/stats";
const SETTINGS_HREF = "/dashboard/advertiser/settings";

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdvertiserDashboardShell({ children }: AdvertiserDashboardShellProps) {
  const t = useT();
  const pathname = usePathname();

  const overviewActive = isActive(pathname, OVERVIEW_HREF, true);
  const campaignsActive = isActive(pathname, CAMPAIGNS_HREF, false);
  const activityActive = isActive(pathname, ACTIVITY_HREF, false);
  const statsActive = isActive(pathname, STATS_HREF, false);
  const settingsActive = isActive(pathname, SETTINGS_HREF, false);

  const overviewLabel = useMemo(() => t.advertiserDashboard.navOverview, [t]);
  const campaignsLabel = useMemo(() => t.advertiserDashboard.navCampaigns, [t]);
  const activityLabel = useMemo(() => t.advertiserDashboard.navActivity, [t]);
  const statsLabel = useMemo(() => t.advertiserDashboard.navStats, [t]);

  return (
    <div className="adv-dash-layout">
      <aside className="adv-dash-rail" aria-label={t.advertiserDashboard.sidebarAria}>
        <div className="adv-dash-rail-top">
          <Link href="/" className="adv-dash-rail-logo" aria-label="SpinShare home">
            <Image
              src="/logo/spinshare-logo.png"
              alt=""
              width={32}
              height={32}
              className="adv-dash-rail-logo-img"
            />
          </Link>
        </div>

        <nav className="adv-dash-rail-nav" aria-label={t.advertiserDashboard.navAria}>
          <Link
            href={OVERVIEW_HREF}
            className={`adv-dash-rail-link${overviewActive ? " adv-dash-rail-link--active" : ""}`}
            aria-label={overviewLabel}
            aria-current={overviewActive ? "page" : undefined}
            title={overviewLabel}
          >
            <LayoutDashboard className="h-[1.125rem] w-[1.125rem]" aria-hidden />
          </Link>

          <Link
            href={CAMPAIGNS_HREF}
            className={`adv-dash-rail-link${campaignsActive ? " adv-dash-rail-link--active" : ""}`}
            aria-label={campaignsLabel}
            aria-current={campaignsActive ? "page" : undefined}
            title={campaignsLabel}
          >
            <Megaphone className="h-[1.125rem] w-[1.125rem]" aria-hidden />
          </Link>

          <Link
            href={ACTIVITY_HREF}
            className={`adv-dash-rail-link${activityActive ? " adv-dash-rail-link--active" : ""}`}
            aria-label={activityLabel}
            aria-current={activityActive ? "page" : undefined}
            title={activityLabel}
          >
            <ScrollText className="h-[1.125rem] w-[1.125rem]" aria-hidden />
          </Link>

          <Link
            href={STATS_HREF}
            className={`adv-dash-rail-link${statsActive ? " adv-dash-rail-link--active" : ""}`}
            aria-label={statsLabel}
            aria-current={statsActive ? "page" : undefined}
            title={statsLabel}
          >
            <BarChart2 className="h-[1.125rem] w-[1.125rem]" aria-hidden />
          </Link>
        </nav>

        <div className="adv-dash-rail-bottom">
          <Link
            href={SETTINGS_HREF}
            className={`adv-dash-rail-link${settingsActive ? " adv-dash-rail-link--active" : ""}`}
            aria-label={t.advertiserDashboard.settings}
            aria-current={settingsActive ? "page" : undefined}
            title={t.advertiserDashboard.settings}
          >
            <Settings className="h-[1.125rem] w-[1.125rem]" aria-hidden />
          </Link>
        </div>
      </aside>

      <div className="adv-dash-main">
        <div className="adv-dash-topbar">
          <div className="adv-dash-topbar-spacer" aria-hidden />
          <DashboardRoleSwitcher />
        </div>
        <main className="adv-dash-main-inner">{children}</main>
      </div>
    </div>
  );
}
