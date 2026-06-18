"use client";

import { useMemo } from "react";
import { BarChart2, MousePointerClick, Eye, CheckCircle2, Percent, Coins, TrendingUp } from "lucide-react";

import { TiltCard } from "@/components/TiltCard";
import { useT } from "@/lib/i18n/locale-provider";
import { useAdvertiserDashboard } from "./advertiser-dashboard-context";
import {
  campaignTelemetry,
  formatCount,
  formatCtr,
  formatUsd,
  sumCampaignTelemetry,
} from "./lib";

function StatCard({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value: string;
  loading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <TiltCard
      className="adv-stats-card"
      intensity={12}
      scale={1.03}
      glow="245, 158, 11"
      glareRadius={200}
    >
      <div className="adv-stats-card-icon">{icon}</div>
      <p className="adv-stats-card-label">{label}</p>
      {loading ? (
        <div className="h-7 w-20 adv-skeleton-block adv-skeleton-pulse mt-1" />
      ) : (
        <p className="adv-stats-card-value tilt-pop-sm">{value}</p>
      )}
    </TiltCard>
  );
}

export function AdvertiserStatsView() {
  const t = useT();
  const { campaignsState } = useAdvertiserDashboard();
  const loading = campaignsState.status === "loading";
  const campaigns = campaignsState.status === "ready" ? campaignsState.campaigns : [];

  const totalTelemetry = useMemo(() => sumCampaignTelemetry(campaigns), [campaigns]);
  const totalBudgetSpentCents = useMemo(
    () =>
      campaigns.reduce((sum, c) => {
        const tel = campaignTelemetry(c);
        return sum + Math.round((tel.credited * c.cpmCents) / 1000);
      }, 0),
    [campaigns],
  );

  const isEmpty = !loading && campaigns.length === 0;

  return (
    <section className="adv-dash-rise flex flex-col gap-6">
      <div>
        <h2 className="adv-dash-section-heading flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-amber-500" aria-hidden />
          {t.advertiserDashboard.statsTitle}
        </h2>
      </div>

      {isEmpty ? (
        <div className="adv-dash-empty">
          <div className="adv-dash-empty-icon">
            <BarChart2 className="h-5 w-5" aria-hidden />
          </div>
          <p className="adv-dash-empty-title">{t.advertiserDashboard.statsNoCampaigns}</p>
        </div>
      ) : (
        <>
          <div className="adv-stats-grid">
            <StatCard
              label={t.advertiserDashboard.statsTotalSpend}
              value={formatUsd(totalBudgetSpentCents)}
              loading={loading}
              icon={<Coins className="h-4 w-4 text-amber-500" aria-hidden />}
            />
            <StatCard
              label={t.advertiserDashboard.statsTotalImpressions}
              value={formatCount(totalTelemetry.credited)}
              loading={loading}
              icon={<CheckCircle2 className="h-4 w-4 text-amber-500" aria-hidden />}
            />
            <StatCard
              label={t.advertiserDashboard.totalShows}
              value={formatCount(totalTelemetry.shows)}
              loading={loading}
              icon={<Eye className="h-4 w-4 text-amber-500" aria-hidden />}
            />
            <StatCard
              label={t.advertiserDashboard.statsTotalClicks}
              value={formatCount(totalTelemetry.clicks)}
              loading={loading}
              icon={<MousePointerClick className="h-4 w-4 text-amber-500" aria-hidden />}
            />
            <StatCard
              label={t.advertiserDashboard.statsAvgCtr}
              value={formatCtr(totalTelemetry.clicks, totalTelemetry.shows)}
              loading={loading}
              icon={<Percent className="h-4 w-4 text-amber-500" aria-hidden />}
            />
          </div>

          {!loading && campaigns.length > 0 && (
            <div className="adv-stats-breakdown">
              <h3 className="adv-stats-breakdown-heading">
                <TrendingUp className="h-4 w-4 text-amber-500" aria-hidden />
                {t.advertiserDashboard.yourCampaigns}
              </h3>
              <div className="adv-stats-breakdown-table">
                {campaigns.map((campaign) => {
                  const tel = campaignTelemetry(campaign);
                  const spentCents = Math.round((tel.credited * campaign.cpmCents) / 1000);
                  return (
                    <div key={campaign.id} className="adv-stats-breakdown-row">
                      <div className="adv-stats-breakdown-name">
                        <p className="adv-stats-breakdown-text">{campaign.adText}</p>
                        <span className="adv-stats-breakdown-status">{campaign.status}</span>
                      </div>
                      <div className="adv-stats-breakdown-nums">
                        <span title={t.advertiserDashboard.statsTotalImpressions}>
                          <CheckCircle2 className="h-3 w-3" aria-hidden />
                          {formatCount(tel.credited)}
                        </span>
                        <span title={t.advertiserDashboard.statsTotalClicks}>
                          <MousePointerClick className="h-3 w-3" aria-hidden />
                          {formatCount(tel.clicks)}
                        </span>
                        <span title={t.advertiserDashboard.statsAvgCtr}>
                          <Percent className="h-3 w-3" aria-hidden />
                          {formatCtr(tel.clicks, tel.shows)}
                        </span>
                        <span title={t.advertiserDashboard.statsTotalSpend}>
                          <Coins className="h-3 w-3" aria-hidden />
                          {formatUsd(spentCents)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
