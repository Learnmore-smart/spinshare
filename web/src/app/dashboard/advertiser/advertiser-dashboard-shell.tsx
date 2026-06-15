"use client";



import { useMemo, type ReactNode } from "react";

import Image from "next/image";

import Link from "next/link";

import { usePathname } from "next/navigation";

import { LayoutDashboard, Settings } from "lucide-react";



import { DashboardRoleSwitcher } from "@/components/DashboardRoleSwitcher";

import { useT } from "@/lib/i18n/locale-provider";



export interface AdvertiserDashboardShellProps {

  children: ReactNode;

}



const OVERVIEW_HREF = "/dashboard/advertiser";

const SETTINGS_HREF = "/dashboard/advertiser/settings";



function isActive(pathname: string, href: string, exact: boolean): boolean {

  if (exact) return pathname === href;

  return pathname === href || pathname.startsWith(`${href}/`);

}



export function AdvertiserDashboardShell({ children }: AdvertiserDashboardShellProps) {

  const t = useT();

  const pathname = usePathname();



  const overviewActive = isActive(pathname, OVERVIEW_HREF, true);

  const settingsActive = isActive(pathname, SETTINGS_HREF, false);



  const overviewLabel = useMemo(() => t.advertiserDashboard.navOverview, [t]);



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

