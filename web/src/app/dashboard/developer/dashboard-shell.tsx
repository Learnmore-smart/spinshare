"use client";

import { useMemo, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, ScrollText, Settings } from "lucide-react";

import { useT } from "@/lib/i18n/locale-provider";

export interface DashboardShellProps {
  children: ReactNode;
}

const NAV = [
  { href: "/dashboard/developer", icon: LayoutDashboard, exact: true as const },
  { href: "/dashboard/developer/earnings", icon: LineChart, exact: false as const },
  { href: "/dashboard/developer/activity", icon: ScrollText, exact: false as const },
] as const;

const SETTINGS_HREF = "/dashboard/developer/settings";

function navLabel(
  t: ReturnType<typeof useT>,
  href: (typeof NAV)[number]["href"] | typeof SETTINGS_HREF,
): string {
  switch (href) {
    case "/dashboard/developer":
      return t.developerDashboard.navOverview;
    case "/dashboard/developer/earnings":
      return t.developerDashboard.navEarnings;
    case "/dashboard/developer/activity":
      return t.developerDashboard.navActivity;
    case SETTINGS_HREF:
      return t.developerDashboard.settings;
  }
}

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: DashboardShellProps) {
  const t = useT();
  const pathname = usePathname();

  const navItems = useMemo(
    () =>
      NAV.map((item) => ({
        ...item,
        label: navLabel(t, item.href),
        active: isActive(pathname, item.href, item.exact),
      })),
    [pathname, t],
  );

  const settingsActive = isActive(pathname, SETTINGS_HREF, false);

  return (
    <div className="dev-dash-layout">
      <aside className="dev-dash-rail" aria-label={t.developerDashboard.sidebarAria}>
        <div className="dev-dash-rail-top">
          <Link href="/" className="dev-dash-rail-logo" aria-label="SpinShare home">
            <Image
              src="/logo/spinshare-logo.png"
              alt=""
              width={32}
              height={32}
              className="dev-dash-rail-logo-img"
            />
          </Link>
        </div>

        <nav className="dev-dash-rail-nav" aria-label={t.developerDashboard.navAria}>
          {navItems.map(({ href, icon: Icon, label, active }) => (
            <Link
              key={href}
              href={href}
              className={`dev-dash-rail-link${active ? " dev-dash-rail-link--active" : ""}`}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              title={label}
            >
              <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
            </Link>
          ))}
        </nav>

        <div className="dev-dash-rail-bottom">
          <Link
            href={SETTINGS_HREF}
            className={`dev-dash-rail-link${settingsActive ? " dev-dash-rail-link--active" : ""}`}
            aria-label={navLabel(t, SETTINGS_HREF)}
            aria-current={settingsActive ? "page" : undefined}
            title={navLabel(t, SETTINGS_HREF)}
          >
            <Settings className="h-[1.125rem] w-[1.125rem]" aria-hidden />
          </Link>
        </div>
      </aside>

      <div className="dev-dash-main">
        <main className="dev-dash-main-inner">{children}</main>
      </div>
    </div>
  );
}
