"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useT } from "@/lib/i18n/locale-provider";
import { toActivityFeedRows, type ActivityFeedSource } from "../activity-feed";
import { sumCampaignTelemetry, nonCreditTotal, type CampaignView } from "./lib";
import type { AdvertiserActivityState } from "./advertiser-activity-feed";

export type LoadState =
  | { status: "loading" }
  | { status: "ready"; campaigns: CampaignView[] }
  | { status: "error"; message: string };

interface AdvertiserDashboardData {
  token: string;
  campaignsState: LoadState;
  activityState: AdvertiserActivityState;
  loadCampaigns: () => Promise<void>;
  loadActivity: () => Promise<void>;
  handleCreated: (created: CampaignView) => void;
}

const AdvertiserDashboardContext = createContext<AdvertiserDashboardData | null>(null);

export function AdvertiserDashboardProviderClient({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  const t = useT();
  const [campaignsState, setCampaignsState] = useState<LoadState>({ status: "loading" });
  const [activityState, setActivityState] = useState<AdvertiserActivityState>({
    status: "loading",
  });

  const loadCampaigns = useCallback(async (): Promise<void> => {
    setCampaignsState({ status: "loading" });
    try {
      const response = await fetch("/api/campaigns", {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        setCampaignsState({
          status: "error",
          message: t.advertiserDashboard.loadError(response.status),
        });
        return;
      }
      const body = (await response.json()) as { campaigns: CampaignView[] };
      setCampaignsState({ status: "ready", campaigns: body.campaigns });
    } catch {
      setCampaignsState({
        status: "error",
        message: t.advertiserDashboard.networkError,
      });
    }
  }, [token, t]);

  const loadActivity = useCallback(async (): Promise<void> => {
    setActivityState({ status: "loading" });
    try {
      const response = await fetch("/api/activity/advertiser", {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        setActivityState({
          status: "error",
          message: `Activity failed to load (${response.status}).`,
        });
        return;
      }
      const body = (await response.json()) as { activities: ActivityFeedSource[] };
      setActivityState({
        status: "ready",
        activities: toActivityFeedRows(body.activities),
      });
    } catch {
      setActivityState({
        status: "error",
        message: "Activity failed to load. Check your connection and retry.",
      });
    }
  }, [token]);

  useEffect(() => {
    void loadCampaigns();
    void loadActivity();
  }, [loadActivity, loadCampaigns]);

  const handleCreated = useCallback(
    (created: CampaignView): void => {
      setCampaignsState((prev) => {
        if (prev.status === "ready") {
          return { status: "ready", campaigns: [created, ...prev.campaigns] };
        }
        void loadCampaigns();
        return prev;
      });
    },
    [loadCampaigns],
  );

  return (
    <AdvertiserDashboardContext.Provider
      value={{
        token,
        campaignsState,
        activityState,
        loadCampaigns,
        loadActivity,
        handleCreated,
      }}
    >
      {children}
    </AdvertiserDashboardContext.Provider>
  );
}

export function useAdvertiserDashboard(): AdvertiserDashboardData {
  const ctx = useContext(AdvertiserDashboardContext);
  if (!ctx) {
    throw new Error("useAdvertiserDashboard must be used within AdvertiserDashboardProviderClient");
  }
  return ctx;
}
