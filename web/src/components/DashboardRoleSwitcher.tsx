"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Code2, Layers } from "lucide-react";

import { SegmentSlider } from "@/components/SegmentSlider";
import { useT } from "@/lib/i18n/locale-provider";

const DEVELOPER_HREF = "/dashboard/developer";
const ADVERTISER_HREF = "/dashboard/advertiser";
/** Matches `segment-slider.css` thumb transition duration. */
const SLIDE_MS = 240;

type DashboardRole = "developer" | "advertiser";

function roleFromPathname(pathname: string): DashboardRole {
  return pathname.startsWith(ADVERTISER_HREF) ? "advertiser" : "developer";
}

export function DashboardRoleSwitcher() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const pathRole = roleFromPathname(pathname);
  const [optimisticRole, setOptimisticRole] = useState<DashboardRole | null>(null);
  const navigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayedRole = optimisticRole ?? pathRole;

  useEffect(() => {
    if (optimisticRole !== null && optimisticRole === pathRole) {
      setOptimisticRole(null);
    }
  }, [pathRole, optimisticRole]);

  useEffect(
    () => () => {
      if (navigateTimer.current !== null) {
        clearTimeout(navigateTimer.current);
      }
    },
    [],
  );

  const handleChange = (next: DashboardRole) => {
    if (next === pathRole) return;

    if (navigateTimer.current !== null) {
      clearTimeout(navigateTimer.current);
    }

    setOptimisticRole(next);

    const delay =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : SLIDE_MS;

    navigateTimer.current = setTimeout(() => {
      router.push(next === "advertiser" ? ADVERTISER_HREF : DEVELOPER_HREF);
    }, delay);
  };

  return (
    <SegmentSlider
      ariaLabel={t.dashboardCommon.roleSwitcherAria}
      value={displayedRole}
      onChange={handleChange}
      compact
      className="dash-role-segment"
      options={[
        {
          value: "developer",
          label: t.dashboardCommon.roleDeveloper,
          icon: <Code2 className="h-3.5 w-3.5 shrink-0" aria-hidden />,
        },
        {
          value: "advertiser",
          label: t.dashboardCommon.roleAdvertiser,
          icon: <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />,
        },
      ]}
    />
  );
}
