"use client";

import { useMemo, useState } from "react";

import { TiltCard } from "@/components/TiltCard";
import { useT } from "@/lib/i18n/locale-provider";

import type { ActivityFeedRow } from "../activity-feed";
import { useDeveloperActivity } from "./developer-activity-context";
import { ActivityList, ActivityTable } from "./developer-dashboard-parts";
import { SetupGuideLinkButton } from "./setup-guide-modal";
import "./developer-dashboard.css";

function normalizeActivitySearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ");
}

export function filterDeveloperActivityRows(
  rows: readonly ActivityFeedRow[],
  query: string,
): ActivityFeedRow[] {
  const normalizedQuery = normalizeActivitySearch(query);
  if (!normalizedQuery) {
    return [...rows];
  }
  return rows.filter((row) =>
    [
      row.activityId,
      row.campaignId,
      row.statusLabel,
      row.durationLabel,
      row.creditLabel,
    ].some((value) => normalizeActivitySearch(value).includes(normalizedQuery)),
  );
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (!/[",\r\n]/.test(text)) {
    return text;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

export function developerActivityRowsToCsv(
  rows: readonly ActivityFeedRow[],
): string {
  const header = [
    "activityId",
    "campaignId",
    "status",
    "duration",
    "credit",
    "createdAtMs",
  ];
  const lines = rows.map((row) =>
    [
      row.activityId,
      row.campaignId,
      row.statusLabel,
      row.durationLabel,
      row.creditLabel,
      row.createdAtMs,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function DeveloperActivityView() {
  const t = useT();
  const { activityState, loadMoreActivity } = useDeveloperActivity();
  const [activityQuery, setActivityQuery] = useState("");

  const activities: ActivityFeedRow[] =
    activityState.status === "ready" ? activityState.activities : [];
  const filteredRows = useMemo(
    () => filterDeveloperActivityRows(activities, activityQuery),
    [activityQuery, activities],
  );
  const csvHref = useMemo(
    () =>
      `data:text/csv;charset=utf-8,${encodeURIComponent(
        developerActivityRowsToCsv(filteredRows),
      )}`,
    [filteredRows],
  );

  return (
    <TiltCard className="dev-dash-panel dev-dash-rise p-4 sm:p-5" intensity={6} scale={1.008}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="dev-dash-section-title">{t.developerDashboard.recentCredit}</h2>
          <p className="dev-dash-section-body">{t.developerDashboard.recentCreditSub}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:max-w-xs">
          <input
            type="search"
            value={activityQuery}
            onChange={(e) => setActivityQuery(e.target.value)}
            placeholder={t.developerDashboard.filterPlaceholder}
            className="spinshare-input w-full px-3 py-2.5 text-sm font-semibold normal-case tracking-normal"
          />
          {filteredRows.length > 0 && (
            <a
              className="spinshare-btn-outline px-3 py-2 text-center text-xs font-black"
              href={csvHref}
              download="spinshare-developer-activity.csv"
            >
              {t.developerDashboard.exportActivityCsv}
            </a>
          )}
        </div>
      </div>

      <div className="mt-4">
        {activityState.status === "loading" && (
          <p className="dev-dash-empty-body py-8 text-center">
            {t.developerDashboard.activityLoading}
          </p>
        )}
        {activityState.status === "error" && (
          <p className="dev-dash-empty-body py-8 text-center">
            {activityState.message}
          </p>
        )}
        {activityState.status === "ready" && activities.length === 0 && (
          <div className="py-8 text-center">
            <p className="dev-dash-empty-body py-8 text-center">
              {t.developerDashboard.activityEmpty}
            </p>
            <SetupGuideLinkButton className="mt-3" />
          </div>
        )}
        {activityState.status === "ready" &&
          activities.length > 0 &&
          (filteredRows.length === 0 ? (
            <p className="dev-dash-empty-body py-8 text-center">
              {t.developerDashboard.noFilterMatch}
            </p>
          ) : (
            <>
              <ActivityList rows={filteredRows} />
              <ActivityTable rows={filteredRows} />
            </>
          ))}
      </div>

      {activityState.status === "ready" &&
        activityState.nextCursor !== undefined && (
          <div className="mt-4 flex flex-col items-start gap-2">
            <button
              type="button"
              className="spinshare-btn-outline px-4 py-2 text-sm font-black"
              disabled={
                activityState.loadingMore === true || loadMoreActivity === undefined
              }
              onClick={loadMoreActivity}
            >
              {activityState.loadingMore === true
                ? t.developerDashboard.loadingMoreActivity
                : t.developerDashboard.loadMoreActivity}
            </button>
            {activityState.loadMoreError !== undefined && (
              <p className="text-xs font-semibold text-red-300">
                {activityState.loadMoreError}
              </p>
            )}
          </div>
        )}
    </TiltCard>
  );
}
