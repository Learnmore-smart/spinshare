"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, Wrench } from "lucide-react";

import { SpinShareWordmark } from "@/components/SpinShareWordmark";
import type { PlatformStats } from "@/server/platform-stats";

import { DevAnalyticsPanel } from "./dev-analytics-panel";
import { DevToolsPanel } from "./dev-tools-panel";
import "./dev.css";

type DevTab = "tools" | "analytics";

export default function DevShell({
  isLocal,
  stats,
  defaultTab = "analytics",
}: {
  isLocal: boolean;
  stats: PlatformStats;
  defaultTab?: DevTab;
}) {
  const [tab, setTab] = useState<DevTab>(defaultTab);

  return (
    <div className="dev-dash">
      <aside className="dev-dash-sidebar">
        <Link href="/" className="dev-dash-brand" aria-label="SpinShare home">
          <Image
            src="/logo/spinshare-logo.png"
            alt="SpinShare Logo"
            width={32}
            height={32}
            className="h-8 w-8 rounded-[8px] object-contain shadow-[0_8px_20px_rgba(22,163,74,0.2)]"
          />
          <SpinShareWordmark className="text-lg" />
        </Link>

        <nav className="dev-dash-nav" aria-label="Dev sections">
          <button
            type="button"
            className="dev-dash-nav-btn"
            data-active={tab === "tools"}
            onClick={() => setTab("tools")}
          >
            <Wrench className="h-4 w-4" />
            Tools
          </button>
          <button
            type="button"
            className="dev-dash-nav-btn"
            data-active={tab === "analytics"}
            onClick={() => setTab("analytics")}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>
        </nav>

        <span className="dev-dash-badge">{isLocal ? "Local" : "Internal"}</span>
      </aside>

      <main className="dev-dash-main">
        {tab === "tools" ? (
          <DevToolsPanel showQuickSignIn={isLocal} />
        ) : (
          <DevAnalyticsPanel stats={stats} />
        )}
      </main>
    </div>
  );
}
