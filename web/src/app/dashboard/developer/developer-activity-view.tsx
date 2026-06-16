"use client";

import { useMemo, useState } from "react";

import { useT } from "@/lib/i18n/locale-provider";

import { useDeveloperDashboard } from "./developer-dashboard-data";
import { ActivityList, ActivityTable } from "./developer-dashboard-parts";
import { SetupGuideLinkButton } from "./setup-guide-modal";
import "./developer-dashboard.css";

export function DeveloperActivityView() {
  const t = useT();
  const { activities } = useDeveloperDashboard();
  const [activityQuery, setActivityQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter(
      (row) =>
        row.campaignId.toLowerCase().includes(q) ||
        row.activityId.toLowerCase().includes(q) ||
        row.statusLabel.toLowerCase().includes(q),
    );
  }, [activityQuery, activities]);

  return (
    <section className="dev-dash-panel dev-dash-rise p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="dev-dash-section-title">{t.developerDashboard.recentCredit}</h2>
          <p className="dev-dash-section-body">{t.developerDashboard.recentCreditSub}</p>
        </div>
        <input
          type="search"
          value={activityQuery}
          onChange={(e) => setActivityQuery(e.target.value)}
          placeholder={t.developerDashboard.filterPlaceholder}
          className="spinshare-input w-full px-3 py-2.5 text-sm font-semibold normal-case tracking-normal sm:max-w-xs"
        />
      </div>

      <div className="mt-4">
        {activities.length === 0 ? (
          <div className="py-8 text-center">
            <p className="dev-dash-empty-body py-8 text-center">
              {t.developerDashboard.activityEmpty}
            </p>
            <SetupGuideLinkButton className="mt-3" />
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="dev-dash-empty-body py-8 text-center">
            {t.developerDashboard.noFilterMatch}
          </p>
        ) : (
          <>
            <ActivityList rows={filteredRows} />
            <ActivityTable rows={filteredRows} />
          </>
        )}
      </div>
    </section>
  );
}
