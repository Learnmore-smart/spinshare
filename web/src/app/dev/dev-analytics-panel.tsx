"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Download, Printer } from "lucide-react";

import { SpinShareWordmark } from "@/components/SpinShareWordmark";
import type { PlatformStats } from "@/server/platform-stats";

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
}

function formatAsOf(updatedAtMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(updatedAtMs));
}

async function exportPoster(node: HTMLElement, filename: string, width: number) {
  const { toPng } = await import("html-to-image");
  const scale = width / node.offsetWidth;
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: Math.max(2, scale),
    width: node.offsetWidth,
    height: node.offsetHeight,
    style: {
      transform: "scale(1)",
      transformOrigin: "top left",
    },
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export function DevAnalyticsPanel({ stats }: { stats: PlatformStats }) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (size: "square" | "wide") => {
    const node = posterRef.current;
    if (!node) return;

    setExporting(size);
    try {
      const width = size === "square" ? 1080 : 1200;
      const filename =
        size === "square"
          ? `spinshare-stats-${stats.updatedAtMs}.png`
          : `spinshare-stats-wide-${stats.updatedAtMs}.png`;
      await exportPoster(node, filename, width);
    } finally {
      setExporting(null);
    }
  };

  const secondaryMetrics = [
    { label: "Advertisers", value: formatCount(stats.totalAdvertisers) },
    { label: "New devs (7d)", value: formatCount(stats.developersLast7d) },
    { label: "New devs (30d)", value: formatCount(stats.developersLast30d) },
    { label: "Payouts connected", value: formatCount(stats.connectedPayouts) },
    { label: "Impressions today", value: formatCount(stats.impressionsToday) },
    { label: "Earnings today", value: stats.earningsTodayUsd },
    { label: "Top CPM", value: stats.topCpmUsd },
    { label: "Ad spend", value: stats.advertiserSpendUsd },
  ];

  return (
    <div>
      <div className="dev-analytics-header">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Platform <span className="spinshare-hero-highlight-3d">Analytics</span>
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Shareable snapshot for social posts. Updated {formatAsOf(stats.updatedAtMs)}.
          </p>
        </div>
        <div className="dev-analytics-actions">
          <button
            type="button"
            className="dev-analytics-btn"
            disabled={exporting !== null}
            onClick={() => handleExport("square")}
          >
            <Download className="mr-1 inline h-3.5 w-3.5" />
            {exporting === "square" ? "Exporting…" : "PNG 1080×1080"}
          </button>
          <button
            type="button"
            className="dev-analytics-btn"
            disabled={exporting !== null}
            onClick={() => handleExport("wide")}
          >
            <Download className="mr-1 inline h-3.5 w-3.5" />
            {exporting === "wide" ? "Exporting…" : "PNG wide"}
          </button>
          <button
            type="button"
            className="dev-analytics-btn"
            onClick={() => window.print()}
          >
            <Printer className="mr-1 inline h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      <div className="dev-poster-wrap">
        <div id="poster-root" ref={posterRef} className="dev-poster">
          <div className="dev-poster-top">
            <div className="dev-poster-brand">
              <Image
                src="/logo/spinshare-logo.png"
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-[8px] object-contain"
              />
              <SpinShareWordmark className="text-lg text-emerald-50" />
            </div>
          </div>

          <p className="dev-poster-title">Developers get paid to wait.</p>
          <p className="dev-poster-sub">Live platform metrics from spinshare.dev</p>

          <div className="dev-poster-hero">
            <div className="dev-poster-stat">
              <p className="dev-poster-stat-label">Total developers</p>
              <p className="dev-poster-stat-value">{formatCount(stats.totalDevelopers)}</p>
            </div>

            <div className="dev-poster-grid">
              <div className="dev-poster-stat">
                <p className="dev-poster-stat-label">Developer earnings</p>
                <p className="dev-poster-stat-value">{stats.totalDeveloperEarningsUsd}</p>
              </div>
              <div className="dev-poster-stat">
                <p className="dev-poster-stat-label">Ad hours served</p>
                <p className="dev-poster-stat-value">{formatHours(stats.adHoursServed)}</p>
              </div>
              <div className="dev-poster-stat">
                <p className="dev-poster-stat-label">Impressions</p>
                <p className="dev-poster-stat-value">
                  {formatCount(stats.totalCreditedImpressions)}
                </p>
              </div>
              <div className="dev-poster-stat">
                <p className="dev-poster-stat-label">Live campaigns</p>
                <p className="dev-poster-stat-value">{formatCount(stats.liveCampaigns)}</p>
              </div>
            </div>
          </div>

          <div className="dev-poster-foot">
            <span>spinshare.dev</span>
            <span>{formatAsOf(stats.updatedAtMs)}</span>
          </div>
        </div>
      </div>

      <div className="dev-metrics-grid">
        {secondaryMetrics.map((metric) => (
          <div key={metric.label} className="dev-metric-card">
            <p className="dev-metric-label">{metric.label}</p>
            <p className="dev-metric-value">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
