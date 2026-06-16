"use client";

import { AdvertiserDashboardProviderClient } from "./advertiser-dashboard-context";
import { AdvertiserOverviewView } from "./advertiser-overview-view";
import { AdvertiserActivityView } from "./advertiser-activity-view";

export interface AdvertiserDashboardProps {
  token: string;
}

export function AdvertiserDashboard({ token }: AdvertiserDashboardProps) {
  return (
    <AdvertiserDashboardProviderClient token={token}>
      <AdvertiserOverviewView />
      <AdvertiserActivityView />
    </AdvertiserDashboardProviderClient>
  );
}
