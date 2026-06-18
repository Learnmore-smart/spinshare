"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartTheme, lightChartTheme } from "@/components/charts/chart-theme";
import type { EarningsSeriesPoint } from "./summarize-ledger";

export interface EarningsChartProps {
  series: EarningsSeriesPoint[];
  variant?: "dark" | "light";
}

export function EarningsChart({ series, variant = "dark" }: EarningsChartProps) {
  const theme = variant === "light" ? lightChartTheme : chartTheme;

  return (
    <div className="h-56 w-full" data-testid="earnings-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={series}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid {...theme.grid} />
          <XAxis dataKey="label" {...theme.axis} />
          <YAxis
            {...theme.axis}
            width={48}
            tickFormatter={(value: number) => `$${value.toFixed(3)}`}
          />
          <Tooltip
            {...theme.tooltip}
            formatter={(value: number) => [`$${value.toFixed(3)}`, "Cumulative"]}
          />
          <Line type="monotone" dataKey="cumulativeUsd" {...theme.line} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
