"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/locale-provider";
import {
  defaultActivityFeedCopy,
  toActivityFeedRows,
  type ActivityFeedCopy,
  type ActivityFeedRow,
  type ActivityFeedSource,
} from "../activity-feed";
import { sumCampaignTelemetry, nonCreditTotal, type CampaignView } from "./lib";
import type { AdvertiserActivityState } from "./advertiser-activity-feed";

export type LoadState =
  | { status: "loading" }
  | { status: "ready"; campaigns: CampaignView[] }
  | { status: "error"; message: string };

/** Editable campaign fields the dashboard can PATCH. */
export interface CampaignEditPatch {
  adText?: string;
  destinationUrl?: string;
  brandName?: string;
  brandIconDataUrl?: string;
  publicOnLeaderboard?: boolean;
  cpmCents?: number;
}

export type UpdateCampaignResult =
  | { ok: true; campaign: CampaignView }
  | { ok: false; error: string };

export type DeleteCampaignResult =
  | { ok: true }
  | { ok: false; error: string };

interface AdvertiserDashboardData {
  token: string;
  campaignsState: LoadState;
  activityState: AdvertiserActivityState;
  loadCampaigns: () => Promise<void>;
  loadActivity: () => Promise<void>;
  loadMoreActivity: () => Promise<void>;
  handleCreated: (created: CampaignView) => void;
  updateCampaign: (
    campaignId: string,
    patch: CampaignEditPatch,
  ) => Promise<UpdateCampaignResult>;
  deleteCampaign: (campaignId: string) => Promise<DeleteCampaignResult>;
}

interface ActivityApiResponse {
  activities: ActivityFeedSource[];
  nextCursor?: string;
}

const AdvertiserDashboardContext = createContext<AdvertiserDashboardData | null>(null);

export function mergeActivityRows(
  existing: readonly ActivityFeedRow[],
  incoming: readonly ActivityFeedSource[],
  copy: ActivityFeedCopy = defaultActivityFeedCopy,
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
  return toActivityFeedRows([...byId.values()], copy);
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
        activities: toActivityFeedRows(body.activities, t.activityFeed),
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
        activities: mergeActivityRows(
          current.activities,
          body.activities,
          t.activityFeed,
        ),
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

  const updateCampaign = useCallback(
    async (
      campaignId: string,
      patch: CampaignEditPatch,
    ): Promise<UpdateCampaignResult> => {
      try {
        const response = await fetch("/api/campaigns", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ campaignId, ...patch }),
        });
        if (response.ok) {
          const updated = (await response.json()) as CampaignView;
          setCampaignsState((prev) =>
            prev.status === "ready"
              ? {
                  status: "ready",
                  campaigns: prev.campaigns.map((c) =>
                    c.id === campaignId
                      ? // Preserve live telemetry; PATCH returns a zero-telemetry view.
                        { ...c, ...updated, telemetry: c.telemetry }
                      : c,
                  ),
                }
              : prev,
          );
          return { ok: true, campaign: updated };
        }
        if (response.status === 401) {
          return { ok: false, error: t.advertiserDashboard.sessionExpired };
        }
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        return {
          ok: false,
          error: body?.error ?? t.advertiserDashboard.campaignRejected,
        };
      } catch {
        return { ok: false, error: t.advertiserDashboard.networkError };
      }
    },
    [token, t],
  );

  const deleteCampaign = useCallback(
    async (campaignId: string): Promise<DeleteCampaignResult> => {
      try {
        const response = await fetch("/api/campaigns", {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ campaignId }),
        });
        if (response.ok) {
          setCampaignsState((prev) =>
            prev.status === "ready"
              ? {
                  status: "ready",
                  campaigns: prev.campaigns.filter((c) => c.id !== campaignId),
                }
              : prev,
          );
          return { ok: true };
        }
        if (response.status === 401) {
          return { ok: false, error: t.advertiserDashboard.sessionExpired };
        }
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        return {
          ok: false,
          error: body?.error ?? t.advertiserDashboard.campaignRejected,
        };
      } catch {
        return { ok: false, error: t.advertiserDashboard.networkError };
      }
    },
    [token, t],
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
        updateCampaign,
        deleteCampaign,
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
