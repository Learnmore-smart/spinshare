"use client";

/**
 * Advertiser dashboard shell (task 12.4).
 *
 * Client orchestrator that owns the campaign list state and wires together the
 * {@link CampaignBuilder} and {@link CampaignList}. On mount it loads the
 * advertiser's campaigns from `GET /api/campaigns` using the bearer
 * `Device_Auth_Token` minted server-side for the session, rendering explicit
 * loading, error (with retry), and ready states. Newly created campaigns are
 * prepended so they appear immediately without a refetch.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/i18n/locale-provider";

import { CampaignBuilder } from "./campaign-builder";
import { CampaignList } from "./campaign-list";
import { formatUsd, type CampaignView } from "./lib";

/** Props for {@link AdvertiserDashboard}. */
export interface AdvertiserDashboardProps {
  /** Bearer `Device_Auth_Token` for the authenticated advertiser. */
  token: string;
}

/** Load lifecycle of the campaign list. */
type LoadState =
  | { status: "loading" }
  | { status: "ready"; campaigns: CampaignView[] }
  | { status: "error"; message: string };

export function AdvertiserDashboard({ token }: AdvertiserDashboardProps) {
  const t = useT();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const loadCampaigns = useCallback(async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/campaigns", {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        setState({
          status: "error",
          message: t.advertiserDashboard.loadError(response.status),
        });
        return;
      }
      const body = (await response.json()) as { campaigns: CampaignView[] };
      setState({ status: "ready", campaigns: body.campaigns });
    } catch {
      setState({
        status: "error",
        message: t.advertiserDashboard.networkError,
      });
    }
  }, [token, t]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const handleCreated = useCallback(
    (created: CampaignView): void => {
      setState((prev) => {
        if (prev.status === "ready") {
          return { status: "ready", campaigns: [created, ...prev.campaigns] };
        }
        void loadCampaigns();
        return prev;
      });
    },
    [loadCampaigns],
  );

  const campaigns = state.status === "ready" ? state.campaigns : [];
  const totalBudgetCents = useMemo(
    () => campaigns.reduce((sum, c) => sum + c.budgetCents, 0),
    [campaigns],
  );

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

      {state.status === "ready" && campaigns.length > 0 && (
        <section className="adv-dash-stat-scroll adv-dash-rise" data-testid="adv-dash-stats">
          <div className="adv-dash-stat">
            <p className="adv-dash-stat-label">{t.advertiserDashboard.yourCampaigns}</p>
            <p className="adv-dash-stat-value">{t.advertiserDashboard.campaignCount(campaigns.length)}</p>
          </div>
          <div className="adv-dash-stat">
            <p className="adv-dash-stat-label">{t.advertiserDashboard.totalBudget}</p>
            <p className="adv-dash-stat-value">{formatUsd(totalBudgetCents)}</p>
          </div>
        </section>
      )}

      <div className="adv-dash-grid adv-dash-rise">
        <CampaignBuilder token={token} onCreated={handleCreated} />

        <section className="flex flex-col gap-4">
          <h2 className="adv-dash-section-heading">{t.advertiserDashboard.yourCampaigns}</h2>

          {state.status === "loading" && (
            <Card data-testid="campaigns-loading">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">
                  {t.advertiserDashboard.loadingCampaigns}
                </CardTitle>
              </CardHeader>
            </Card>
          )}

          {state.status === "error" && (
            <Card data-testid="campaigns-error">
              <CardHeader>
                <CardTitle className="text-base text-destructive">
                  {t.advertiserDashboard.somethingWrong}
                </CardTitle>
                <CardDescription>{state.message}</CardDescription>
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

          {state.status === "ready" && (
            <CampaignList token={token} campaigns={state.campaigns} />
          )}
        </section>
      </div>
    </>
  );
}
