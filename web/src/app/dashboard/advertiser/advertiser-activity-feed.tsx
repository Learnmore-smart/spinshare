"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";

import { useT } from "@/lib/i18n/locale-provider";
import { activityDetailItems, type ActivityFeedRow } from "../activity-feed";

function ActivityRowSkeleton() {
  return (
    <li className="adv-dash-activity-row adv-skeleton-pulse">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="h-4 w-1/3 adv-skeleton-block mb-2.5" />
            <div className="flex gap-2 items-center">
              <div className="h-3.5 w-16 adv-skeleton-block" />
              <div className="h-3.5 w-12 adv-skeleton-block" />
            </div>
          </div>
          <div className="h-5 w-16 adv-skeleton-block" />
        </div>
      </div>
    </li>
  );
}

export type AdvertiserActivityFilter =
  | "all"
  | "billable"
  | "nonBillable"
  | "payments";

export type AdvertiserActivityState =
  | { status: "loading" }
  | {
      status: "ready";
      activities: ActivityFeedRow[];
      nextCursor?: string;
      loadingMore?: boolean;
      loadMoreError?: string;
    }
  | { status: "error"; message: string };

function isBillableActivity(activity: ActivityFeedRow): boolean {
  return activity.status === "credited" || activity.status === "budgetDebited";
}

function isPaymentActivity(activity: ActivityFeedRow): boolean {
  return (
    activity.type === "advertiser_event" &&
    (activity.status === "checkoutStarted" || activity.status === "budgetFunded")
  );
}

/**
 * Collects the `checkoutSessionId`s that have a confirmed `budgetFunded` event.
 * A `checkoutStarted` row whose session is absent from this set was started but
 * never funded, so the advertiser can be offered a "Resume payment" action.
 */
export function fundedCheckoutSessionIds(
  rows: readonly ActivityFeedRow[],
): Set<string> {
  const funded = new Set<string>();
  for (const row of rows) {
    if (row.status === "budgetFunded" && row.checkoutSessionId !== undefined) {
      funded.add(row.checkoutSessionId);
    }
  }
  return funded;
}

/**
 * A checkout is resumable when it was started (a `checkoutStarted` advertiser
 * event) but no matching `budgetFunded` event exists for its session.
 */
export function isResumableCheckout(
  activity: ActivityFeedRow,
  fundedSessionIds: ReadonlySet<string>,
): boolean {
  return (
    activity.type === "advertiser_event" &&
    activity.status === "checkoutStarted" &&
    (activity.checkoutSessionId === undefined ||
      !fundedSessionIds.has(activity.checkoutSessionId))
  );
}

function matchesActivityFilter(
  activity: ActivityFeedRow,
  filter: AdvertiserActivityFilter,
): boolean {
  switch (filter) {
    case "billable":
      return isBillableActivity(activity);
    case "nonBillable":
      return !isBillableActivity(activity) && !isPaymentActivity(activity);
    case "payments":
      return isPaymentActivity(activity);
    case "all":
      return true;
  }
}

export function filterAdvertiserActivityRows(
  rows: readonly ActivityFeedRow[],
  filter: AdvertiserActivityFilter,
  query: string,
): ActivityFeedRow[] {
  const normalizedQuery = normalizeActivitySearch(query);
  return rows.filter((activity) => {
    if (!matchesActivityFilter(activity, filter)) {
      return false;
    }
    if (normalizedQuery.length === 0) {
      return true;
    }
    return [
      activity.activityId,
      activity.campaignId,
      activity.statusLabel,
      activity.durationLabel,
      activity.creditLabel,
    ].some((value) =>
      normalizeActivitySearch(value).includes(normalizedQuery),
    );
  });
}

function normalizeActivitySearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ");
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (!/[",\r\n]/.test(text)) {
    return text;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

export function advertiserActivityRowsToCsv(
  rows: readonly ActivityFeedRow[],
): string {
  const header = [
    "activityId",
    "campaignId",
    "status",
    "duration",
    "amount",
    "createdAtMs",
  ];
  const lines = rows.map((activity) =>
    [
      activity.activityId,
      activity.campaignId,
      activity.statusLabel,
      activity.durationLabel,
      activity.creditLabel,
      activity.createdAtMs,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function AdvertiserActivityFeed({
  state,
  onLoadMore,
}: {
  state: AdvertiserActivityState;
  onLoadMore?: () => void;
}) {
  const t = useT();
  const [activityQuery, setActivityQuery] = useState("");
  const [activityFilter, setActivityFilter] =
    useState<AdvertiserActivityFilter>("all");
  const visibleActivities = useMemo(
    () =>
      state.status === "ready"
        ? filterAdvertiserActivityRows(
            state.activities,
            activityFilter,
            activityQuery,
          )
        : [],
    [activityFilter, activityQuery, state],
  );
  const csvHref = useMemo(
    () =>
      `data:text/csv;charset=utf-8,${encodeURIComponent(
        advertiserActivityRowsToCsv(visibleActivities),
      )}`,
    [visibleActivities],
  );
  const fundedSessionIds = useMemo(
    () =>
      state.status === "ready"
        ? fundedCheckoutSessionIds(state.activities)
        : new Set<string>(),
    [state],
  );
  const filterOptions: Array<{
    value: AdvertiserActivityFilter;
    label: string;
  }> = [
    { value: "all", label: t.advertiserDashboard.allActivity },
    { value: "billable", label: t.advertiserDashboard.billableActivity },
    { value: "nonBillable", label: t.advertiserDashboard.nonBillableActivity },
    { value: "payments", label: t.advertiserDashboard.paymentActivity },
  ];

  return (
    <section className="adv-dash-panel adv-dash-rise" data-testid="advertiser-activity-feed">
      <div className="adv-dash-panel-header">
        <h2 className="adv-dash-panel-title">{t.advertiserDashboard.recentActivity}</h2>
        <p className="adv-dash-panel-desc">
          {t.advertiserDashboard.recentActivityDesc}
        </p>
      </div>

      <div className="adv-dash-activity-body">
        {state.status === "loading" && (
          <div data-testid="activity-loading">
            <span className="sr-only">{t.advertiserDashboard.loadingActivity}</span>
            <ul className="adv-dash-activity-list">
              {[1, 2, 3, 4].map((i) => (
                <ActivityRowSkeleton key={i} />
              ))}
            </ul>
          </div>
        )}

        {state.status === "error" && (
          <p className="adv-dash-activity-empty">{state.message}</p>
        )}

        {state.status === "ready" && state.activities.length === 0 && (
          <p className="adv-dash-activity-empty">
            {t.advertiserDashboard.noActivityYet}
          </p>
        )}

        {state.status === "ready" && state.activities.length > 0 && (
          <>
            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <input
                type="search"
                value={activityQuery}
                onChange={(event) => setActivityQuery(event.target.value)}
                placeholder={t.advertiserDashboard.activitySearchPlaceholder}
                className="spinshare-input w-full px-3 py-2.5 text-sm font-semibold normal-case tracking-normal xl:max-w-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      option.value === activityFilter
                        ? "spinshare-btn-primary px-3 py-2 text-xs font-black"
                        : "spinshare-btn-outline px-3 py-2 text-xs font-black"
                    }
                    onClick={() => setActivityFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
                {visibleActivities.length > 0 && (
                  <a
                    className="spinshare-btn-outline px-3 py-2 text-xs font-black"
                    href={csvHref}
                    download="spinshare-advertiser-activity.csv"
                  >
                    {t.advertiserDashboard.exportActivityCsv}
                  </a>
                )}
              </div>
            </div>
            {visibleActivities.length === 0 ? (
              <p className="adv-dash-activity-empty">
                {t.advertiserDashboard.noActivityFilterMatch}
              </p>
            ) : (
            <ul className="adv-dash-activity-list">
              {visibleActivities.map((activity) => {
                const details = activityDetailItems(activity, {
                  amountLabel: t.activityFeed.detailLabels.amount,
                  copy: t.activityFeed,
                });
                return (
                <li
                  key={activity.activityId}
                  className="adv-dash-activity-row"
                  data-testid="advertiser-activity-row"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
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
                    </div>
                    {isResumableCheckout(activity, fundedSessionIds) && (
                      <Link
                        href={`/dashboard/advertiser/campaigns?fund=${encodeURIComponent(activity.campaignId)}`}
                        className="adv-dash-activity-resume"
                        title={t.advertiserDashboard.resumeCheckoutHint}
                        data-testid="resume-checkout"
                      >
                        <CreditCard className="h-3.5 w-3.5" aria-hidden />
                        {t.advertiserDashboard.resumeCheckout}
                      </Link>
                    )}
                    <details className="mt-2 text-xs font-semibold text-slate-400">
                      <summary className="cursor-pointer text-slate-300">
                        {t.activityFeed.detailsSummary}
                      </summary>
                      <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                        {details.map((item) => (
                          <div key={item.label} className="min-w-0">
                            <dt className="text-[10px] font-black uppercase text-slate-500">
                              {item.label}
                            </dt>
                            <dd className="truncate font-mono text-[11px] text-slate-300">
                              {item.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  </div>
                </li>
                );
              })}
            </ul>
            )}
            {state.nextCursor !== undefined && (
              <div className="mt-4 flex flex-col items-start gap-2">
                <button
                  type="button"
                  className="spinshare-btn-outline px-4 py-2 text-sm font-black"
                  disabled={state.loadingMore === true || onLoadMore === undefined}
                  onClick={onLoadMore}
                >
                  {state.loadingMore === true
                    ? t.advertiserDashboard.loadingMoreActivity
                    : t.advertiserDashboard.loadMoreActivity}
                </button>
                {state.loadMoreError !== undefined && (
                  <p className="text-xs font-semibold text-red-300">
                    {state.loadMoreError}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
