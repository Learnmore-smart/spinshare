"use client";

import { useMemo, useState } from "react";

import { SegmentSlider } from "@/components/SegmentSlider";
import { TiltCard } from "@/components/TiltCard";
import { useLocale, useT } from "@/lib/i18n/locale-provider";
import { useTheme } from "@/lib/theme/theme-provider";

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
  const locale = useLocale();
  const { resolved } = useTheme();
  const chartRangeOptions = useChartRangeOptions();
  const [chartRange, setChartRange] = useState<ChartRange>("7d");
  const { summary } = useDeveloperDashboard();
  const { impressionCount, rows } = summary;

  const chartSeries = useMemo(
    () => buildChartSeries(rows, chartRange, undefined, locale),
    [rows, chartRange, locale],
  );

  return (
    <TiltCard className="dev-dash-panel dev-dash-rise p-4 sm:p-5" intensity={6} scale={1.008}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="dev-dash-section-title">{t.developerDashboard.earningsCurve}</h2>
          <p className="dev-dash-section-body">{t.developerDashboard.earningsCurveSub}</p>
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
          <div className="dev-dash-empty" data-testid="empty-state">
            <span className="text-3xl" aria-hidden>
              🤑
            </span>
            <p className="dev-dash-empty-title">{t.developerDashboard.nothingCreditedYet}</p>
            <p className="dev-dash-empty-body">
              {t.developerDashboard.installToStart}
            </p>
            <SetupGuideLinkButton className="mt-3" />
          </div>
        ) : (
          <EarningsChart series={chartSeries} variant={resolved === "dark" ? "dark" : "light"} />
        )}
      </div>
    </TiltCard>
  );
}
