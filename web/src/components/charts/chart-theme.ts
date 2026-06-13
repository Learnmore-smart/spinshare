/**
 * Recharts theming for the SpinShare cyberpunk palette.
 *
 * Recharts renders SVG and cannot read Tailwind utility classes, so chart
 * colors are provided here as concrete values that match the CSS variables in
 * `globals.css` (neon-green #00FF00 on near-black). The developer-earnings
 * chart (task 12.3) consumes these constants so the charts stay visually
 * consistent with the rest of the UI.
 */

/** Primary neon-green accent (== `--primary` / `--neon`, #00FF00). */
export const NEON_GREEN = "#00FF00";

/** Dimmed neon-green for secondary series / hover states. */
export const NEON_GREEN_DIM = "#22b822";

/** Near-black surface color (== `--background`). */
export const SURFACE = "#050505";

/** Dim green-tinted grid/axis lines (matches `--border`). */
export const GRID = "#1b3d1b";

/** Desaturated green for axis tick / legend text (matches `--muted-foreground`). */
export const AXIS_TEXT = "#9bcf9b";

/**
 * Shared Recharts theme object. Spread the relevant slices into Recharts
 * components, e.g. `<CartesianGrid {...chartTheme.grid} />`,
 * `<Line {...chartTheme.line} />`.
 */
export const chartTheme = {
  /** Ordered color series for multi-line/bar charts. */
  series: [NEON_GREEN, NEON_GREEN_DIM, AXIS_TEXT] as const,
  grid: {
    stroke: GRID,
    strokeDasharray: "3 3",
  },
  axis: {
    stroke: GRID,
    tick: { fill: AXIS_TEXT, fontSize: 12 },
  },
  line: {
    stroke: NEON_GREEN,
    strokeWidth: 2,
    dot: { fill: NEON_GREEN, r: 2 },
    activeDot: { r: 4 },
  },
  tooltip: {
    contentStyle: {
      backgroundColor: SURFACE,
      border: `1px solid ${GRID}`,
      borderRadius: 6,
      color: NEON_GREEN,
    },
    cursor: { stroke: NEON_GREEN_DIM },
  },
} as const;
