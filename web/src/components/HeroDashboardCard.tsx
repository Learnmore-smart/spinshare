"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

// Deterministic, organic "market" wave: gentle peaks and valleys that finish
// on an upward climb. The chart auto-scales, so values are a fixed shape.
function generateWaveChartData() {
  const count = 60;
  const points: { index: number; value: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const wave =
      Math.sin(t * Math.PI * 5) * 0.12 +
      Math.sin(t * Math.PI * 9 + 1) * 0.06 +
      Math.sin(t * Math.PI * 2.3) * 0.05;
    const drift = t * 0.12;
    const finalClimb = Math.pow(Math.max(0, t - 0.68) / 0.32, 2) * 0.5;
    const value = 0.45 + wave + drift + finalClimb;
    points.push({ index: i, value });
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
  const chartData = useMemo(() => generateWaveChartData(), []);

  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ rx: 0, ry: 0, x: 0, y: 0, isHovered: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Tilt angle
    const rY = ((mouseX / width) - 0.5) * 20;
    const rX = (0.5 - (mouseY / height)) * 20;

    const px = (mouseX / width) * 100;
    const py = (mouseY / height) * 100;

    setCoords({ rx: rX, ry: rY, x: px, y: py, isHovered: true });
  };

  const handleMouseLeave = () => {
    setCoords((prev) => ({ ...prev, rx: 0, ry: 0, isHovered: false }));
  };

  const cardStyle: React.CSSProperties = {
    transform: `perspective(1000px) rotateX(${coords.rx}deg) rotateY(${coords.ry}deg) scale3d(${coords.isHovered ? 1.03 : 1}, ${coords.isHovered ? 1.03 : 1}, 1)`,
    transition: coords.isHovered
      ? "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.15s ease-out"
      : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s ease-out",
    boxShadow: coords.isHovered
      ? "0 30px 60px -15px rgba(16, 185, 129, 0.18), 0 15px 30px -10px rgba(0, 0, 0, 0.1)"
      : "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.02)",
    transformStyle: "preserve-3d",
  };

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={cardStyle}
      className="liquid-glass group relative overflow-hidden p-6 sm:p-7 select-none"
    >
      {/* Glare/shine effect */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle 250px at ${coords.x}% ${coords.y}%, rgba(16, 185, 129, 0.16), transparent 75%)`,
        }}
      />
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
