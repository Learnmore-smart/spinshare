"use client";

import { useMemo } from "react";
import { Timer } from "lucide-react";

import { TiltCard } from "@/components/TiltCard";
import { useT } from "@/lib/i18n/locale-provider";
import CheckoutStatusBanner from "../../checkout-status-banner";
import { useAdvertiserDashboard } from "./advertiser-dashboard-context";
import { CampaignBuilder } from "./campaign-builder";
import {
  formatCount,
  formatCtr,
  formatUsd,
  nonCreditTotal,
  sumCampaignTelemetry,
} from "./lib";

export function AdvertiserOverviewView() {
  const t = useT();
  const { token, campaignsState, handleCreated } = useAdvertiserDashboard();

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
      <TiltCard
        className="adv-dash-hero adv-dash-rise"
        intensity={8}
        scale={1.01}
        glow="245, 158, 11"
        glareRadius={520}
      >
        <h1 className="adv-dash-hero-title">{t.advertiserDashboard.title}</h1>
        <p className="adv-dash-hero-sub">{t.advertiserDashboard.subtitle}</p>
        <p className="adv-dash-badge">
          <Timer className="h-3.5 w-3.5" aria-hidden />
          {t.advertiserDashboard.minViewSeconds}
        </p>
      </TiltCard>

      <CheckoutStatusBanner />

      <section className="adv-dash-stat-scroll adv-dash-rise" data-testid="adv-dash-stats">
        <TiltCard className="adv-dash-stat" intensity={15} scale={1.04} glow="245, 158, 11" glareRadius={180}>
          <p className="adv-dash-stat-label">{t.advertiserDashboard.yourCampaigns}</p>
          {campaignsState.status === "loading" ? (
            <div className="h-7 w-12 adv-skeleton-block adv-skeleton-pulse mt-1" />
          ) : (
            <p className="adv-dash-stat-value tilt-pop-sm">{t.advertiserDashboard.campaignCount(campaigns.length)}</p>
          )}
        </TiltCard>
        <TiltCard className="adv-dash-stat" intensity={15} scale={1.04} glow="245, 158, 11" glareRadius={180}>
          <p className="adv-dash-stat-label">{t.advertiserDashboard.totalBudget}</p>
          {campaignsState.status === "loading" ? (
            <div className="h-7 w-20 adv-skeleton-block adv-skeleton-pulse mt-1" />
          ) : (
            <p className="adv-dash-stat-value tilt-pop-sm">{formatUsd(totalBudgetCents)}</p>
          )}
        </TiltCard>
        <TiltCard className="adv-dash-stat" intensity={15} scale={1.04} glow="245, 158, 11" glareRadius={180}>
          <p className="adv-dash-stat-label">{t.advertiserDashboard.totalShows}</p>
          {campaignsState.status === "loading" ? (
            <div className="h-7 w-16 adv-skeleton-block adv-skeleton-pulse mt-1" />
          ) : (
            <p className="adv-dash-stat-value tilt-pop-sm">{formatCount(totalTelemetry.shows)}</p>
          )}
        </TiltCard>
        <TiltCard className="adv-dash-stat" intensity={15} scale={1.04} glow="245, 158, 11" glareRadius={180}>
          <p className="adv-dash-stat-label">{t.advertiserDashboard.totalServed}</p>
          {campaignsState.status === "loading" ? (
            <div className="h-7 w-16 adv-skeleton-block adv-skeleton-pulse mt-1" />
          ) : (
            <p className="adv-dash-stat-value tilt-pop-sm">{formatCount(totalTelemetry.credited)}</p>
          )}
        </TiltCard>
        <TiltCard className="adv-dash-stat" intensity={15} scale={1.04} glow="245, 158, 11" glareRadius={180}>
          <p className="adv-dash-stat-label">{t.advertiserDashboard.clicks}</p>
          {campaignsState.status === "loading" ? (
            <div className="h-7 w-12 adv-skeleton-block adv-skeleton-pulse mt-1" />
          ) : (
            <p className="adv-dash-stat-value tilt-pop-sm">{formatCount(totalTelemetry.clicks)}</p>
          )}
        </TiltCard>
        <TiltCard className="adv-dash-stat" intensity={15} scale={1.04} glow="245, 158, 11" glareRadius={180}>
          <p className="adv-dash-stat-label">{t.advertiserDashboard.ctr}</p>
          {campaignsState.status === "loading" ? (
            <div className="h-7 w-14 adv-skeleton-block adv-skeleton-pulse mt-1" />
          ) : (
            <p className="adv-dash-stat-value tilt-pop-sm">{formatCtr(totalTelemetry.clicks, totalTelemetry.shows)}</p>
          )}
        </TiltCard>
        <TiltCard className="adv-dash-stat" intensity={15} scale={1.04} glow="245, 158, 11" glareRadius={180}>
          <p className="adv-dash-stat-label">{t.advertiserDashboard.uncredited}</p>
          {campaignsState.status === "loading" ? (
            <div className="h-7 w-16 adv-skeleton-block adv-skeleton-pulse mt-1" />
          ) : (
            <p className="adv-dash-stat-value tilt-pop-sm">{formatCount(totalUncredited)}</p>
          )}
        </TiltCard>
      </section>

      <section className="adv-dash-rise">
        <CampaignBuilder token={token} onCreated={handleCreated} />
      </section>
    </>
  );
}
