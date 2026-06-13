"use client";

/**
 * Earnings-over-time line chart for the developer dashboard (Requirement 8.2).
 *
 * Recharts renders SVG in the browser (it measures its container at runtime),
 * so this is a client component. It is purely presentational: it receives the
 * already-computed {@link EarningsSeriesPoint} series from the server component
 * and draws the cumulative-earnings line. Colors come from the shared
 * `chartTheme` so the chart matches the cyberpunk palette.
 */

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartTheme } from "@/components/charts/chart-theme";
import type { EarningsSeriesPoint } from "./summarize-ledger";

/** Props for {@link EarningsChart}. */
export interface EarningsChartProps {
  /** Cumulative-earnings series, one point per impression. */
  series: EarningsSeriesPoint[];
}

/** Cumulative developer earnings across recorded impressions. */
export function EarningsChart({ series }: EarningsChartProps) {
  return (
    <div className="h-64 w-full" data-testid="earnings-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={series}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid {...chartTheme.grid} />
          <XAxis dataKey="label" {...chartTheme.axis} />
          <YAxis
            {...chartTheme.axis}
            width={64}
            tickFormatter={(value: number) => `$${value.toFixed(2)}`}
          />
          <Tooltip
            {...chartTheme.tooltip}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Cumulative"]}
          />
          <Line type="monotone" dataKey="cumulativeUsd" {...chartTheme.line} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
