"use client";

import { useMemo, useState } from "react";

import { SegmentSlider } from "@/components/SegmentSlider";
import { useT } from "@/lib/i18n/locale-provider";

import { useDeveloperDashboard } from "./developer-dashboard-data";
import { EarningsChart } from "./earnings-chart";
import { SetupGuideLinkButton } from "./setup-guide-modal";
import { buildChartSeries, type ChartRange } from "./summarize-ledger";
import "./developer-dashboard.css";

function useChartRangeOptions() {
  const t = useT();
  return [
    { value: "24h" as const, label: t.developerDashboard.chartRange24h },
    { value: "7d" as const, label: t.developerDashboard.chartRange7d },
    { value: "30d" as const, label: t.developerDashboard.chartRange30d },
    { value: "all" as const, label: t.developerDashboard.chartRangeAll },
  ];
}

export function DeveloperEarningsView() {
  const t = useT();
  const chartRangeOptions = useChartRangeOptions();
  const [chartRange, setChartRange] = useState<ChartRange>("7d");
  const { summary } = useDeveloperDashboard();
  const { impressionCount, rows } = summary;

  const chartSeries = useMemo(
    () => buildChartSeries(rows, chartRange),
    [rows, chartRange],
  );

  return (
    <section className="dev-dash-panel dev-dash-rise p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-900">{t.developerDashboard.earningsCurve}</h2>
          <p className="text-xs font-semibold text-slate-500">{t.developerDashboard.earningsCurveSub}</p>
        </div>
        <SegmentSlider
          ariaLabel={t.developerDashboard.chartTimeRangeAria}
          className="w-full sm:max-w-md"
          compact
          value={chartRange}
          onChange={setChartRange}
          options={chartRangeOptions}
        />
      </div>
      <div className="mt-4">
        {impressionCount === 0 ? (
          <div
            className="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300/50 bg-white/50 px-4 text-center"
            data-testid="empty-state"
          >
            <span className="text-3xl" aria-hidden>
              🤑
            </span>
            <p className="text-sm font-bold text-slate-700">{t.developerDashboard.nothingCreditedYet}</p>
            <p className="max-w-xs text-xs font-semibold text-slate-500">
              {t.developerDashboard.installToStart}
            </p>
            <SetupGuideLinkButton className="mt-3" />
          </div>
        ) : (
          <EarningsChart series={chartSeries} variant="light" />
        )}
      </div>
    </section>
  );
}
