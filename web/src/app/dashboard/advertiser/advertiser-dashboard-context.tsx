"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/locale-provider";
import {
  toActivityFeedRows,
  type ActivityFeedRow,
  type ActivityFeedSource,
} from "../activity-feed";
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
  loadMoreActivity: () => Promise<void>;
  handleCreated: (created: CampaignView) => void;
}

interface ActivityApiResponse {
  activities: ActivityFeedSource[];
  nextCursor?: string;
}

const AdvertiserDashboardContext = createContext<AdvertiserDashboardData | null>(null);

export function mergeActivityRows(
  existing: readonly ActivityFeedRow[],
  incoming: readonly ActivityFeedSource[],
): ActivityFeedRow[] {
  const byId = new Map<string, ActivityFeedSource>();
  for (const activity of existing) {
    byId.set(activity.activityId, activity);
  }
  for (const activity of incoming) {
    if (!byId.has(activity.activityId)) {
      byId.set(activity.activityId, activity);
    }
  }
  return toActivityFeedRows([...byId.values()]);
}

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
      const body = (await response.json()) as ActivityApiResponse;
      setActivityState({
        status: "ready",
        activities: toActivityFeedRows(body.activities),
        ...(body.nextCursor !== undefined ? { nextCursor: body.nextCursor } : {}),
      });
    } catch {
      setActivityState({
        status: "error",
        message: t.advertiserDashboard.activityLoadMoreError,
      });
    }
  }, [token, t]);

  const loadMoreActivity = useCallback(async (): Promise<void> => {
    if (
      activityState.status !== "ready" ||
      activityState.nextCursor === undefined ||
      activityState.loadingMore === true
    ) {
      return;
    }

    const current = activityState;
    const cursor = activityState.nextCursor;
    setActivityState({
      ...current,
      loadingMore: true,
      loadMoreError: undefined,
    });

    try {
      const response = await fetch(
        `/api/activity/advertiser?cursor=${encodeURIComponent(cursor)}`,
        {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (!response.ok) {
        setActivityState({
          ...current,
          loadingMore: false,
          loadMoreError: `Activity failed to load (${response.status}).`,
        });
        return;
      }

      const body = (await response.json()) as ActivityApiResponse;
      setActivityState({
        status: "ready",
        activities: mergeActivityRows(current.activities, body.activities),
        ...(body.nextCursor !== undefined ? { nextCursor: body.nextCursor } : {}),
      });
    } catch {
      setActivityState({
        ...current,
        loadingMore: false,
        loadMoreError: t.advertiserDashboard.activityLoadMoreError,
      });
    }
  }, [activityState, token, t]);

  const pathname = usePathname();

  useEffect(() => {
    if (
      pathname === "/dashboard/advertiser" ||
      pathname === "/dashboard/advertiser/campaigns" ||
      pathname === "/dashboard/advertiser/stats"
    ) {
      void loadCampaigns();
    } else if (pathname === "/dashboard/advertiser/activity") {
      void loadActivity();
    }
  }, [pathname, loadCampaigns, loadActivity]);

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
        loadMoreActivity,
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
