"use client";

import { formatCentsAsUsd } from "@spinshare/core";

import { TiltCard } from "@/components/TiltCard";
import { useT } from "@/lib/i18n/locale-provider";

import type { ActivityFeedRow } from "../activity-feed";
import { DashboardShell } from "./dashboard-shell";

export function money(cents: number): string {
  return `$${formatCentsAsUsd(cents)}`;
}

/**
 * Format display micro-cents (100,000 micro-cents = $1.00) as a fixed
 * 3-decimal USD string, e.g. `492500 -> "$4.925"`. Used for the hero
 * payout-threshold copy so the visible remaining/target line up with the
 * sub-cent balance KPI rather than rounding to whole cents.
 */
export function moneyMicrocents3(microcents: number): string {
  return `$${(microcents / 100_000).toFixed(3)}`;
}

export function pct(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, (used / limit) * 100);
}

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="dev-dash">
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}

export function LimitMeter({
  label,
  usedCents,
  usedLabel,
  limitCents,
  reset,
}: {
  label: string;
  usedCents: number;
  usedLabel?: string;
  limitCents: number;
  reset: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold text-[var(--dev-ink)]">{label}</span>
        <span className="tabular-nums text-xs font-bold text-[var(--dev-muted)]">
          {usedLabel ?? money(usedCents)} / {money(limitCents)}
        </span>
      </div>
      <div className="dev-dash-limit-track" role="progressbar" aria-valuenow={usedCents} aria-valuemax={limitCents}>
        <div className="dev-dash-limit-fill" style={{ width: `${pct(usedCents, limitCents)}%` }} />
      </div>
      <p className="text-[11px] font-semibold text-[var(--dev-muted)]">{reset}</p>
    </div>
  );
}

export function ActivityList({
  rows,
}: {
  rows: ActivityFeedRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <ul className="space-y-2 md:hidden">
      {rows.map((row) => (
        <li key={row.activityId}>
          <TiltCard className="dev-dash-activity-card" intensity={10} scale={1.02} glareRadius={200} data-testid="activity-row">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] text-slate-500">{row.campaignId}</p>
                <p className="mt-0.5 truncate text-[10px] font-bold text-slate-400">
                  {row.statusLabel} - {row.durationLabel}
                </p>
              </div>
              <p
                className={`shrink-0 text-base font-black ${
                  row.counted ? "text-emerald-700" : "text-slate-500"
                }`}
                data-testid="activity-credit"
              >
                {row.creditLabel}
              </p>
            </div>
          </TiltCard>
        </li>
      ))}
    </ul>
  );
}

export function ActivityTable({
  rows,
}: {
  rows: ActivityFeedRow[];
}) {
  const t = useT();
  if (rows.length === 0) return null;

  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm" data-testid="activity-table">
        <thead>
          <tr className="border-b border-emerald-900/10 text-slate-500">
            <th className="py-2 pr-3 text-xs font-black uppercase tracking-wide">{t.developerDashboard.tableHash}</th>
            <th className="py-2 pr-3 text-xs font-black uppercase tracking-wide">{t.developerDashboard.tableCampaign}</th>
            <th className="py-2 pr-3 text-xs font-black uppercase tracking-wide">{t.developerDashboard.tableEvent}</th>
            <th className="py-2 text-right text-xs font-black uppercase tracking-wide">{t.developerDashboard.tableCredit}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.activityId} className="border-b border-emerald-900/5" data-testid="activity-row">
              <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">
                {row.durationLabel}
              </td>
              <td className="py-2.5 pr-3 font-mono text-xs">{row.campaignId}</td>
              <td className="max-w-[200px] truncate py-2.5 pr-3 text-xs font-bold text-slate-500">
                {row.statusLabel}
              </td>
              <td
                className={`py-2.5 text-right font-bold ${
                  row.counted ? "text-emerald-700" : "text-slate-500"
                }`}
                data-testid="activity-credit"
              >
                {row.creditLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DeveloperDashboardError({ message }: { message?: string }) {
  const t = useT();
  return (
    <DashboardChrome>
      <div className="dev-dash-panel border-rose-200/80 p-5 sm:p-6" data-testid="error-state">
        <h2 className="text-lg font-black text-rose-700">{t.developerDashboard.loadErrorTitle}</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          {message ?? t.developerDashboard.loadErrorDefault}
        </p>
      </div>
    </DashboardChrome>
  );
}
