"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useT } from "@/lib/i18n/locale-provider";
import {
  toActivityFeedRows,
  type ActivityFeedRow,
  type ActivityFeedSource,
} from "../activity-feed";

export type DeveloperActivityState =
  | { status: "loading" }
  | {
      status: "ready";
      activities: ActivityFeedRow[];
      nextCursor?: string;
      loadingMore?: boolean;
      loadMoreError?: string;
    }
  | { status: "error"; message: string };

interface DeveloperActivityData {
  activityState: DeveloperActivityState;
  loadActivity: () => Promise<void>;
  loadMoreActivity: () => Promise<void>;
}

interface ActivityApiResponse {
  activities: ActivityFeedSource[];
  nextCursor?: string;
}

const DeveloperActivityContext = createContext<DeveloperActivityData | null>(
  null,
);

export function mergeDeveloperActivityRows(
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

export function DeveloperActivityProviderClient({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  const t = useT();
  const [activityState, setActivityState] = useState<DeveloperActivityState>({
    status: "loading",
  });

  const loadActivity = useCallback(async (): Promise<void> => {
    setActivityState({ status: "loading" });
    try {
      const response = await fetch("/api/activity/developer", {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        setActivityState({
          status: "error",
          message: t.developerDashboard.activityLoadMoreError,
        });
        return;
      }
      const body = (await response.json()) as ActivityApiResponse;
      setActivityState({
        status: "ready",
        activities: toActivityFeedRows(body.activities),
        ...(body.nextCursor !== undefined
          ? { nextCursor: body.nextCursor }
          : {}),
      });
    } catch {
      setActivityState({
        status: "error",
        message: t.developerDashboard.activityLoadMoreError,
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
        `/api/activity/developer?cursor=${encodeURIComponent(cursor)}`,
        {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (!response.ok) {
        setActivityState({
          ...current,
          loadingMore: false,
          loadMoreError: t.developerDashboard.activityLoadMoreError,
        });
        return;
      }

      const body = (await response.json()) as ActivityApiResponse;
      setActivityState({
        status: "ready",
        activities: mergeDeveloperActivityRows(
          current.activities,
          body.activities,
        ),
        ...(body.nextCursor !== undefined
          ? { nextCursor: body.nextCursor }
          : {}),
      });
    } catch {
      setActivityState({
        ...current,
        loadingMore: false,
        loadMoreError: t.developerDashboard.activityLoadMoreError,
      });
    }
  }, [activityState, token, t]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  return (
    <DeveloperActivityContext.Provider
      value={{ activityState, loadActivity, loadMoreActivity }}
    >
      {children}
    </DeveloperActivityContext.Provider>
  );
}

export function useDeveloperActivity(): DeveloperActivityData {
  const ctx = useContext(DeveloperActivityContext);
  if (!ctx) {
    throw new Error(
      "useDeveloperActivity must be used within DeveloperActivityProviderClient",
    );
  }
  return ctx;
}
