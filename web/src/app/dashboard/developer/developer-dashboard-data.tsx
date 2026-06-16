"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { ActivityFeedRow } from "../activity-feed";
import type { DeveloperDashboardSummary } from "./summarize-ledger";

export interface DeveloperDashboardUser {
  email: string;
  userId: string;
}

interface DeveloperDashboardData {
  activities: ActivityFeedRow[];
  summary: DeveloperDashboardSummary;
  user: DeveloperDashboardUser;
}

const DeveloperDashboardContext = createContext<DeveloperDashboardData | null>(null);

export function DeveloperDashboardProvider({
  activities,
  summary,
  user,
  children,
}: DeveloperDashboardData & { children: ReactNode }) {
  return (
    <DeveloperDashboardContext.Provider value={{ activities, summary, user }}>
      {children}
    </DeveloperDashboardContext.Provider>
  );
}

export function useDeveloperDashboard(): DeveloperDashboardData {
  const ctx = useContext(DeveloperDashboardContext);
  if (!ctx) {
    throw new Error("useDeveloperDashboard must be used within DeveloperDashboardProvider");
  }
  return ctx;
}
