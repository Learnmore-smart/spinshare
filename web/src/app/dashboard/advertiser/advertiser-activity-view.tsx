"use client";

import { useAdvertiserDashboard } from "./advertiser-dashboard-context";
import { AdvertiserActivityFeed } from "./advertiser-activity-feed";

export function AdvertiserActivityView() {
  const { activityState, loadMoreActivity } = useAdvertiserDashboard();
  return (
    <AdvertiserActivityFeed
      state={activityState}
      onLoadMore={loadMoreActivity}
    />
  );
}
