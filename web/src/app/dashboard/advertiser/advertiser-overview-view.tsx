"use client";

import { useMemo } from "react";
import { Timer } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { useAdvertiserDashboard } from "./advertiser-dashboard-context";
import { CampaignBuilder } from "./campaign-builder";
import { CampaignList } from "./campaign-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatCount,
  formatCtr,
  formatUsd,
  nonCreditTotal,
  sumCampaignTelemetry,
} from "./lib";

export function AdvertiserOverviewView() {
  const t = useT();
  const { token, campaignsState, loadCampaigns, handleCreated } = useAdvertiserDashboard();

  const campaigns = campaignsState.status === "ready" ? campaignsState.campaigns : [];
  const totalBudgetCents = useMemo(
    () => campaigns.reduce((sum, c) => sum + c.budgetCents, 0),
    [campaigns],
  );
  const totalTelemetry = useMemo(
    () => sumCampaignTelemetry(campaigns),
    [campaigns],
  );
  const totalUncredited = nonCreditTotal(totalTelemetry);

  return (
    <>
      <section className="adv-dash-hero adv-dash-rise">
        <h1 className="adv-dash-hero-title">{t.advertiserDashboard.title}</h1>
        <p className="adv-dash-hero-sub">{t.advertiserDashboard.subtitle}</p>
        <p className="adv-dash-badge">
          <Timer className="h-3.5 w-3.5" aria-hidden />
          {t.advertiserDashboard.minViewSeconds}
        </p>
      </section>

      <section className="adv-dash-stat-scroll adv-dash-rise" data-testid="adv-dash-stats">
        <div className="adv-dash-stat">
          <p className="adv-dash-stat-label">{t.advertiserDashboard.yourCampaigns}</p>
          <p className="adv-dash-stat-value">{t.advertiserDashboard.campaignCount(campaigns.length)}</p>
        </div>
        <div className="adv-dash-stat">
          <p className="adv-dash-stat-label">{t.advertiserDashboard.totalBudget}</p>
          <p className="adv-dash-stat-value">{formatUsd(totalBudgetCents)}</p>
        </div>
        <div className="adv-dash-stat">
          <p className="adv-dash-stat-label">{t.advertiserDashboard.totalShows}</p>
          <p className="adv-dash-stat-value">{formatCount(totalTelemetry.shows)}</p>
        </div>
        <div className="adv-dash-stat">
          <p className="adv-dash-stat-label">{t.advertiserDashboard.totalServed}</p>
          <p className="adv-dash-stat-value">{formatCount(totalTelemetry.credited)}</p>
        </div>
        <div className="adv-dash-stat">
          <p className="adv-dash-stat-label">{t.advertiserDashboard.clicks}</p>
          <p className="adv-dash-stat-value">{formatCount(totalTelemetry.clicks)}</p>
        </div>
        <div className="adv-dash-stat">
          <p className="adv-dash-stat-label">{t.advertiserDashboard.ctr}</p>
          <p className="adv-dash-stat-value">{formatCtr(totalTelemetry.clicks, totalTelemetry.shows)}</p>
        </div>
        <div className="adv-dash-stat">
          <p className="adv-dash-stat-label">{t.advertiserDashboard.uncredited}</p>
          <p className="adv-dash-stat-value">{formatCount(totalUncredited)}</p>
        </div>
      </section>

      <div className="adv-dash-grid adv-dash-rise">
        <CampaignBuilder token={token} onCreated={handleCreated} />

        <section className="flex flex-col gap-4">

          {campaignsState.status === "loading" && (
            <Card data-testid="campaigns-loading">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">
                  {t.advertiserDashboard.loadingCampaigns}
                </CardTitle>
              </CardHeader>
            </Card>
          )}

          {campaignsState.status === "error" && (
            <Card data-testid="campaigns-error">
              <CardHeader>
                <CardTitle className="text-base text-destructive">
                  {t.advertiserDashboard.somethingWrong}
                </CardTitle>
                <CardDescription>{campaignsState.message}</CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void loadCampaigns();
                  }}
                >
                  {t.advertiserDashboard.retry}
                </Button>
              </div>
            </Card>
          )}

          {campaignsState.status === "ready" && (
            <CampaignList token={token} campaigns={campaignsState.campaigns} />
          )}
        </section>
      </div>
    </>
  );
}
