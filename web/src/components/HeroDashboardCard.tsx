"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

function generateMockChartData(baseValue: number) {
  const points = [];
  const count = 60;
  let value = baseValue - 1.5;
  const step = 1.5 / count;
  for (let i = 0; i < count; i++) {
    // Add a tiny bit of jitter, but keep it mostly growing
    value += step + (Math.random() * 0.01 - 0.005);
    points.push({ index: i, value });
  }
  // Ensure the last point is exactly baseValue
  const lastPoint = points[points.length - 1];
  if (lastPoint) {
    lastPoint.value = baseValue;
  }
  return points;
}

interface HeroDashboardCardProps {
  monthlyEstimate: number;
  liveCampaigns?: number;
  totalImpressions?: number;
}

export function HeroDashboardCard({
  monthlyEstimate,
  liveCampaigns,
  totalImpressions,
}: HeroDashboardCardProps) {
  const [mounted, setMounted] = useState(false);
  const [chartData, setChartData] = useState<{ index: number; value: number }[]>([]);
  const lastAppendTimeRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    setChartData(generateMockChartData(monthlyEstimate));
    lastAppendTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const now = Date.now();
    const shouldAppend = now - lastAppendTimeRef.current >= 5000;

    setChartData((prev) => {
      if (prev.length === 0) return prev;

      let next;
      if (shouldAppend) {
        next = [...prev, { index: prev.length, value: monthlyEstimate }];
        if (next.length > 80) {
          next.shift();
        }
        lastAppendTimeRef.current = now;
      } else {
        next = [...prev];
        const last = next[next.length - 1];
        if (last) {
          next[next.length - 1] = {
            index: last.index,
            value: monthlyEstimate,
          };
        }
      }
      return next.map((p, i) => ({ ...p, index: i }));
    });
  }, [monthlyEstimate, mounted]);

  const formattedEarnings = `+$${monthlyEstimate.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedLiveCampaigns = liveCampaigns !== undefined ? `${liveCampaigns} 个` : "--";

  const formattedTotalImpressions = useMemo(() => {
    if (totalImpressions === undefined) return "--";
    if (totalImpressions === 0) return "0";
    if (totalImpressions >= 1000) {
      const k = totalImpressions / 1000;
      return `${k.toFixed(1).replace(".0", "")}k`;
    }
    return totalImpressions.toString();
  }, [totalImpressions]);

  return (
    <div className="liquid-glass relative overflow-hidden p-6 sm:p-7">
      {/* Top badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-callout)] bg-[var(--surface-callout)] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[var(--text-accent-strong)]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          实时收益
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
          <TrendingUp className="h-3 w-3" />
          +12%
        </span>
      </div>

      {/* Earnings amount */}
      <div className="mt-4">
        <div className="spinshare-hero-highlight-3d text-4xl font-black tracking-tight sm:text-5xl">
          {formattedEarnings}
        </div>
        <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">
          本月预估收益
        </p>
      </div>

      {/* Mini chart */}
      <div className="mt-4 h-20 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#heroChartFill)"
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-lg bg-[var(--surface-empty)]" />
        )}
      </div>

      {/* Bottom stats */}
      <div className="mt-4 flex items-center gap-4 border-t border-[var(--border-subtle)] pt-4">
        <div>
          <p className="text-xs font-bold text-[var(--text-muted)]">广告数</p>
          <p className="text-sm font-black text-[var(--text-primary)]">{formattedLiveCampaigns}</p>
        </div>
        <div className="h-8 w-px bg-[var(--border-subtle)]" />
        <div>
          <p className="text-xs font-bold text-[var(--text-muted)]">展示次数</p>
          <p className="text-sm font-black text-[var(--text-primary)]">{formattedTotalImpressions}</p>
        </div>
      </div>
    </div>
  );
}
