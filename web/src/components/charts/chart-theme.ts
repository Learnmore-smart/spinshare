/**
 * Recharts theming for the SpinShare cyberpunk palette.
 *
 * Recharts renders SVG and cannot read Tailwind utility classes, so chart
 * colors are provided here as concrete values that match the CSS variables in
 * `globals.css` (neon-green #00FF00 on near-black). The developer-earnings
 * chart (task 12.3) consumes these constants so the charts stay visually
 * consistent with the rest of the UI.
 */

/**
 * Recharts theming for the SpinShare palette, responsive to CSS variables.
 * Consumed by the developer-earnings chart.
 */

export const chartTheme = {
  /** Ordered color series for multi-line/bar charts. */
  series: [
    "hsl(var(--primary))",
    "hsl(var(--neon-dim))",
    "hsl(var(--muted-foreground))"
  ] as const,
  grid: {
    stroke: "hsl(var(--border))",
    strokeDasharray: "3 3",
  },
  axis: {
    stroke: "hsl(var(--border))",
    tick: { fill: "hsl(var(--muted-foreground))", fontSize: 12 },
  },
  line: {
    stroke: "hsl(var(--primary))",
    strokeWidth: 2,
    dot: { fill: "hsl(var(--primary))", r: 2 },
    activeDot: { r: 4 },
  },
  tooltip: {
    contentStyle: {
      backgroundColor: "hsl(var(--card))",
      border: `1px solid hsl(var(--border))`,
      borderRadius: 6,
      color: "hsl(var(--foreground))",
    },
    cursor: { stroke: "hsl(var(--muted))" },
  },
} as const;

/** Light dashboard chart palette (mint page background). */
export const lightChartTheme = {
  grid: {
    stroke: "#d1e7dd",
    strokeDasharray: "3 3",
  },
  axis: {
    stroke: "#d1e7dd",
    tick: { fill: "#64748b", fontSize: 11 },
  },
  line: {
    stroke: "#10b981",
    strokeWidth: 2,
    dot: { fill: "#10b981", r: 2 },
    activeDot: { r: 4 },
  },
  tooltip: {
    contentStyle: {
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      color: "#0f172a",
      fontSize: 12,
    },
    cursor: { stroke: "#cbd5e1" },
  },
} as const;
