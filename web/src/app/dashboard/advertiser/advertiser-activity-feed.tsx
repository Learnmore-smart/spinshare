import type { ActivityFeedRow } from "../activity-feed";

export type AdvertiserActivityState =
  | { status: "loading" }
  | { status: "ready"; activities: ActivityFeedRow[] }
  | { status: "error"; message: string };

export function AdvertiserActivityFeed({
  state,
}: {
  state: AdvertiserActivityState;
}) {
  return (
    <section className="adv-dash-panel adv-dash-rise" data-testid="advertiser-activity-feed">
      <div className="adv-dash-panel-header">
        <h2 className="adv-dash-panel-title">Recent activity</h2>
        <p className="adv-dash-panel-desc">
          Impression attempts, billable outcomes, and non-billed reasons.
        </p>
      </div>

      <div className="adv-dash-activity-body">
        {state.status === "loading" && (
          <p className="adv-dash-activity-empty">Loading activity...</p>
        )}

        {state.status === "error" && (
          <p className="adv-dash-activity-empty">{state.message}</p>
        )}

        {state.status === "ready" && state.activities.length === 0 && (
          <p className="adv-dash-activity-empty">
            No activity yet. Funded campaigns will appear here after developer wait states.
          </p>
        )}

        {state.status === "ready" && state.activities.length > 0 && (
          <ul className="adv-dash-activity-list">
            {state.activities.map((activity) => (
              <li
                key={activity.activityId}
                className="adv-dash-activity-row"
                data-testid="advertiser-activity-row"
              >
                <div className="min-w-0">
                  <p className="adv-dash-activity-campaign">{activity.campaignId}</p>
                  <p className="adv-dash-activity-meta">
                    <span
                      className={
                        activity.counted
                          ? "adv-dash-activity-status adv-dash-activity-status--counted"
                          : "adv-dash-activity-status"
                      }
                    >
                      {activity.statusLabel}
                    </span>
                    <span>{activity.durationLabel}</span>
                  </p>
                </div>
                <p
                  className={
                    activity.counted
                      ? "adv-dash-activity-credit adv-dash-activity-credit--counted"
                      : "adv-dash-activity-credit"
                  }
                >
                  {activity.creditLabel}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
