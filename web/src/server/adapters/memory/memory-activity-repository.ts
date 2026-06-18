import type {
  ActivityRepository,
  ActivityRecord,
  AdvertiserActivity,
  DeveloperActivityRecord,
} from "../../ports/activity-repository";

export class MemoryActivityRepository implements ActivityRepository {
  private readonly activities = new Map<string, ActivityRecord>();

  async record(activity: ActivityRecord): Promise<void> {
    if (!this.activities.has(activity.activityId)) {
      this.activities.set(activity.activityId, { ...activity });
    }
  }

  async listByDeveloper(
    developerId: string,
  ): Promise<DeveloperActivityRecord[]> {
    return [...this.activities.values()]
      .filter(
        (activity): activity is DeveloperActivityRecord =>
          activity.type !== "advertiser_event" &&
          activity.developerId === developerId,
      )
      .map((activity) => ({ ...activity }));
  }

  async listByCampaignIds(campaignIds: string[]): Promise<ActivityRecord[]> {
    const campaignSet = new Set(campaignIds);
    return [...this.activities.values()]
      .filter((activity) => campaignSet.has(activity.campaignId))
      .map((activity) => ({ ...activity }));
  }

  async listByCheckoutSessionId(
    sessionId: string,
  ): Promise<AdvertiserActivity[]> {
    return [...this.activities.values()]
      .filter(
        (activity): activity is AdvertiserActivity =>
          activity.type === "advertiser_event" &&
          activity.checkoutSessionId === sessionId,
      )
      .map((activity) => ({ ...activity }));
  }

  all(): ActivityRecord[] {
    return [...this.activities.values()].map((activity) => ({ ...activity }));
  }
}
