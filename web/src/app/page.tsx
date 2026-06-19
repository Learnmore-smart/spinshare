"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Clock, Copy, PieChart, RefreshCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SegmentSlider } from "@/components/SegmentSlider";
import AdvertiserCheckoutForm from "./advertiser-checkout-form";
import CheckoutStatusBanner, {
  CHECKOUT_FUNDED_MARKET_REFRESH_EVENT,
} from "./checkout-status-banner";
import LoadingStatus, {
  ELLIPSIS_STEP_MS,
  ICON_FRAME_MS,
  LOADING_ICONS,
  LOADING_VERBS,
} from "@/components/LoadingStatus";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SiteNavAuth } from "@/components/SiteNavAuth";
import { SpinShareWordmark } from "@/components/SpinShareWordmark";
import { useT } from "@/lib/i18n/locale-provider";
import { HeroDashboardCard } from "@/components/HeroDashboardCard";

const DEVELOPER_SIGNIN_HREF =
  "/signin?role=developer&callbackUrl=%2Fdashboard%2Fdeveloper";
const ADVERTISER_SIGNIN_HREF =
  "/signin?role=advertiser&callbackUrl=%2Fdashboard%2Fadvertiser";

const MARKET_REFRESH_MS = 15_000;
const DEVELOPER_SHARE_PERCENT = 60;
const BID_HISTORY_STORAGE_KEY = "spinshare:bid-history";
const BID_HISTORY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const BID_HISTORY_MAX_POINTS = 2_000;

interface BidSnapshot {
  atMs: number;
  topCpmCents: number;
}

interface BidChartPoint {
  atMs: number;
  time: string;
  bid: number;
}

export interface BidChartSeries {
  points: BidChartPoint[];
  windowStartMs: number;
  windowEndMs: number;
}

interface MarketRow {
  id: string;
  rank: number;
  adText: string;
  cpmCents: number;
  cpmUsd: string;
  bidLabel: string;
  remainingBudgetCents: number;
  remainingBudgetUsd: string;
  servedImpressions: number;
  targetImpressions: number;
  totalPaidCents: number;
  totalPaidUsd: string;
  status: "live";
}

interface MarketResponse {
  rows: MarketRow[];
  summary: {
    liveCampaigns: number;
    topCpmCents: number;
    topCpmUsd: string;
  };
  updatedAtMs: number;
}

type MarketStatus = "loading" | "ready" | "error";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

function formatUpdatedAt(updatedAtMs: number | undefined, loadingLabel: string): string {
  if (!updatedAtMs) return loadingLabel;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(updatedAtMs);
}

function formatImpressionsCount(val: number): string {
  if (val === 0) return "0";
  if (val >= 1000) {
    const k = val / 1000;
    return `${k.toFixed(1).replace(".0", "")}k`;
  }
  return val.toString();
}

function loadBidHistory(): BidSnapshot[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(BID_HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as BidSnapshot[];
    const cutoff = Date.now() - BID_HISTORY_MAX_AGE_MS;

    return parsed
      .filter(
        (point) =>
          typeof point.atMs === "number" &&
          typeof point.topCpmCents === "number" &&
          point.atMs >= cutoff,
      )
      .slice(-BID_HISTORY_MAX_POINTS);
  } catch {
    return [];
  }
}

function saveBidHistory(history: BidSnapshot[]): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(BID_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore quota errors.
  }
}

function appendBidSnapshot(
  history: BidSnapshot[],
  topCpmCents: number,
  atMs: number,
): BidSnapshot[] {
  const cutoff = atMs - BID_HISTORY_MAX_AGE_MS;
  const last = history[history.length - 1];

  if (last && last.atMs === atMs && last.topCpmCents === topCpmCents) {
    return history;
  }

  return [...history, { atMs, topCpmCents }]
    .filter((point) => point.atMs >= cutoff)
    .slice(-BID_HISTORY_MAX_POINTS);
}

function formatChartTime(atMs: number, timeframe: "24h" | "all"): string {
  const date = new Date(atMs);

  if (timeframe === "24h") {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
  }

  if (Date.now() - atMs > 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

export function buildBidChartData(
  history: BidSnapshot[],
  timeframe: "24h" | "all",
  nowMs = Date.now(),
): BidChartSeries | null {
  const windowMs =
    timeframe === "24h" ? 24 * 60 * 60 * 1000 : BID_HISTORY_MAX_AGE_MS;
  const windowStartMs = nowMs - windowMs;
  const windowEndMs = nowMs;
  const filtered = history.filter((point) => point.atMs >= windowStartMs);

  if (filtered.length === 0) return null;

  const maxPoints = timeframe === "24h" ? 32 : 48;
  let samples: Array<{ atMs: number; bid: number }>;

  if (filtered.length <= maxPoints) {
    samples = filtered.map((point) => ({
      atMs: point.atMs,
      bid: point.topCpmCents / 100,
    }));
  } else {
    const bucketMs = windowMs / maxPoints;
    samples = [];

    for (let i = 0; i < maxPoints; i++) {
      const bucketStart = windowStartMs + i * bucketMs;
      const bucketEnd = bucketStart + bucketMs;
      const inBucket = filtered.filter(
        (point) => point.atMs >= bucketStart && point.atMs < bucketEnd,
      );

      if (inBucket.length === 0) continue;

      const last = inBucket[inBucket.length - 1]!;
      samples.push({
        atMs: last.atMs,
        bid: last.topCpmCents / 100,
      });
    }
  }

  if (samples.length === 0) return null;

  const padded: Array<{ atMs: number; bid: number }> = [];
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;

  if (first.atMs > windowStartMs) {
    padded.push({ atMs: windowStartMs, bid: first.bid });
  }

  for (const sample of samples) {
    const previous = padded[padded.length - 1];
    if (previous && previous.atMs === sample.atMs) {
      padded[padded.length - 1] = sample;
      continue;
    }
    padded.push(sample);
  }

  const latest = padded[padded.length - 1]!;
  if (latest.atMs < windowEndMs) {
    padded.push({ atMs: windowEndMs, bid: last.bid });
  }

  return {
    windowStartMs,
    windowEndMs,
    points: padded.map((sample) => ({
      atMs: sample.atMs,
      bid: sample.bid,
      time: formatChartTime(sample.atMs, timeframe),
    })),
  };
}

const INSTALL_COMMAND =
  "curl -L https://spinshare.dev/vsix -o spinshare.vsix && code --install-extension spinshare.vsix";

function HeroInstallCommand({
  command,
  title,
  hint,
  copyLabel,
  copiedLabel,
}: {
  command: string;
  title: string;
  hint: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied — ignore */
    }
  };

  return (
    <div className="spinshare-btn-primary w-full max-w-3xl rounded-[24px] p-4 text-white sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-2xl">
          <MoneyIcon />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-black leading-tight sm:text-xl">{title}</p>
          <p className="mt-0.5 text-sm font-bold text-emerald-50">{hint}</p>
        </div>
      </div>
      <div className="mt-3.5 flex flex-col items-stretch gap-2 rounded-2xl border border-black/25 bg-[#0a0a0b] p-2 sm:flex-row sm:items-start">
        <code className="flex min-w-0 flex-1 items-start gap-2 px-2 py-1 font-mono text-xs leading-relaxed text-emerald-100 sm:text-sm">
          <span className="shrink-0 select-none font-black text-emerald-500">$</span>
          <span className="min-w-0 break-all">{command}</span>
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          aria-live="polite"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-stretch rounded-xl bg-white px-4 py-2 text-xs font-black text-[var(--color-primary-700)] transition hover:bg-emerald-50 sm:self-start sm:text-sm"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}

function MoneyIcon({ className = "" }: { className?: string }) {
  return (
    <span
      aria-label="money"
      role="img"
      className={`inline-grid place-items-center leading-none ${className}`}
    >
      🤑
    </span>
  );
}

function Smile60Icon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="16"
        y="13"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontWeight="800"
        fill="currentColor"
        stroke="none"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        60%
      </text>
      <path d="M 8 20 Q 16 26 24 20" />
    </svg>
  );
}

function ThreeDCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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

  const style: React.CSSProperties = {
    transform: `perspective(1000px) rotateX(${coords.rx}deg) rotateY(${coords.ry}deg) scale3d(${coords.isHovered ? 1.03 : 1}, ${coords.isHovered ? 1.03 : 1}, 1)`,
    transition: coords.isHovered ? "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.15s ease-out" : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s ease-out",
    boxShadow: coords.isHovered
      ? "0 30px 60px -15px rgba(16, 185, 129, 0.18), 0 15px 30px -10px rgba(0, 0, 0, 0.1)"
      : "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.02)",
    transformStyle: "preserve-3d",
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={`threed-card group relative rounded-2xl border border-[var(--border-default)] bg-[var(--surface-white)] p-6 select-none flex items-start gap-4 ${className}`}
    >
      {/* Glare/shine effect */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle 250px at ${coords.x}% ${coords.y}%, rgba(16, 185, 129, 0.16), transparent 75%)`,
        }}
      />
      {children}
    </div>
  );
}

function ThreeDTableCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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
    const rY = ((mouseX / width) - 0.5) * 10;
    const rX = (0.5 - (mouseY / height)) * 10;

    const px = (mouseX / width) * 100;
    const py = (mouseY / height) * 100;

    setCoords({ rx: rX, ry: rY, x: px, y: py, isHovered: true });
  };

  const handleMouseLeave = () => {
    setCoords((prev) => ({ ...prev, rx: 0, ry: 0, isHovered: false }));
  };

  const style: React.CSSProperties = {
    transform: `perspective(1000px) rotateX(${coords.rx}deg) rotateY(${coords.ry}deg) scale3d(${coords.isHovered ? 1.01 : 1}, ${coords.isHovered ? 1.01 : 1}, 1)`,
    transition: coords.isHovered ? "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.15s ease-out" : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s ease-out",
    boxShadow: coords.isHovered
      ? "0 30px 60px -15px rgba(16, 185, 129, 0.18), 0 15px 30px -10px rgba(0, 0, 0, 0.1)"
      : "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.02)",
    transformStyle: "preserve-3d",
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={`threed-card group relative rounded-2xl border border-[var(--border-default)] bg-[var(--surface-white)] select-none w-full overflow-hidden ${className}`}
    >
      {/* Glare/shine effect */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle 350px at ${coords.x}% ${coords.y}%, rgba(16, 185, 129, 0.16), transparent 75%)`,
        }}
      />
      <div className="threed-card-content w-full relative z-20">
        {children}
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const [gradId, setGradId] = useState("");
  useEffect(() => {
    setGradId(`sparkline-grad-${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  if (data.length < 2) {
    return null;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 30;

  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return { x, y };
  });

  const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(" L ")}`;
  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const lastPoint = points[points.length - 1];

  if (lastPoint === undefined) {
    return null;
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      {gradId && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
          </linearGradient>
        </defs>
      )}
      <path
        d={fillD}
        fill={gradId ? `url(#${gradId})` : "none"}
      />
      <path
        d={pathD}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={lastPoint.y}
        r="3"
        fill="#10b981"
      />
    </svg>
  );
}

interface TopEarner {
  rank: number;
  lifetimeEarned: number;
  earningPerHour: number;
  totalHours: number;
  history: number[];
}

const TOP_EARNERS_DATA: TopEarner[] = [
  // Rank 1: Steady linear growth with a slight dip in the middle, then a rise
  { rank: 1, lifetimeEarned: 18924.50, earningPerHour: 24.50, totalHours: 772.4, history: [12000, 12500, 13100, 14200, 15800, 17200, 18924.50] },
  // Rank 2: Exponential takeoff (very low early on, then surging rapidly)
  { rank: 2, lifetimeEarned: 16420.80, earningPerHour: 21.80, totalHours: 753.2, history: [4000, 4200, 4800, 6500, 9000, 12800, 16420.80] },
  // Rank 3: High early growth, then mostly flat/plateaued recently
  { rank: 3, lifetimeEarned: 14105.00, earningPerHour: 19.50, totalHours: 723.3, history: [8000, 12500, 12700, 12800, 13500, 13800, 14105.00] },
  // Rank 4: Decelerating growth (very high early start, then tapering off)
  { rank: 4, lifetimeEarned: 11850.20, earningPerHour: 17.20, totalHours: 688.9, history: [3000, 7000, 9500, 10500, 11000, 11400, 11850.20] },
  // Rank 5: Distinct double stepped growth (staircase style)
  { rank: 5, lifetimeEarned: 9640.40, earningPerHour: 15.50, totalHours: 621.9, history: [6000, 6100, 7800, 7900, 8000, 9500, 9640.40] },
  // Rank 6: Accelerating parabolic curve
  { rank: 6, lifetimeEarned: 7980.15, earningPerHour: 14.10, totalHours: 565.9, history: [2000, 2300, 2800, 3700, 4900, 6500, 7980.15] },
  // Rank 7: Steady, wavy growth (rising, slight dip, then rising)
  { rank: 7, lifetimeEarned: 6350.60, earningPerHour: 12.80, totalHours: 496.1, history: [4500, 5200, 4900, 5600, 5400, 6000, 6350.60] },
  // Rank 8: S-Curve / Sigmoid (slow start, rapid middle, plateauing end)
  { rank: 8, lifetimeEarned: 5120.30, earningPerHour: 11.50, totalHours: 445.2, history: [2000, 2200, 2600, 4200, 4800, 5000, 5120.30] },
  // Rank 9: Jagged staircase with a recent spike
  { rank: 9, lifetimeEarned: 4050.90, earningPerHour: 10.20, totalHours: 397.1, history: [1500, 2500, 2600, 2700, 2750, 2800, 4050.90] },
  // Rank 10: Smooth curved growth with a late surge
  { rank: 10, lifetimeEarned: 3210.45, earningPerHour: 9.10, totalHours: 352.8, history: [1000, 1200, 1500, 1900, 2100, 2200, 3210.45] }
];

const CLAUDE_CATEGORIES = ["Bash", "Glob", "Write", "Read"] as const;

const CLAUDE_STATES = LOADING_VERBS.map((verb, i) => ({
  action: verb,
  category: CLAUDE_CATEGORIES[i % CLAUDE_CATEGORIES.length],
  duration: Math.max(3.0, 1.0 + ((i * 7 + 3) % 25) / 10),
}));

export default function HomePage() {
  const t = useT();
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>("loading");
  const [timeframe, setTimeframe] = useState<"24h" | "all">("24h");
  const [bidHistory, setBidHistory] = useState<BidSnapshot[]>([]);
  const [mounted, setMounted] = useState(false);

  const isLocalhost = mounted && (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.endsWith(".local")
  );

  useEffect(() => {
    setMounted(true);
    setBidHistory(loadBidHistory());
  }, []);
  const [liveEarnings, setLiveEarnings] = useState<number>(0);
  const [claudeStateIndex, setClaudeStateIndex] = useState<number>(0);
  const [leftTimer, setLeftTimer] = useState<number>(0.0);
  const [rightTimer, setRightTimer] = useState<number>(0.0);

  const currentClaudeState = CLAUDE_STATES[claudeStateIndex] ?? CLAUDE_STATES[0]!;

  const leftElapsedMs = Math.round(leftTimer * 1000);
  const leftIconIndex = Math.floor(leftElapsedMs / ICON_FRAME_MS) % LOADING_ICONS.length;
  const leftIcon = LOADING_ICONS[leftIconIndex] ?? "\u00b7";

  const rightElapsedMs = Math.round(rightTimer * 1000);
  const sharedDotCount = Math.floor(rightElapsedMs / ELLIPSIS_STEP_MS) % 4;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLeftTimer((prev) => {
        const nextVal = prev + 0.1;
        if (nextVal >= currentClaudeState.duration) {
          setClaudeStateIndex((prevIdx) => (prevIdx + 1) % CLAUDE_STATES.length);
          return 0.0;
        }
        return nextVal;
      });
      setRightTimer((prev) => {
        const nextVal = prev + 0.1;
        return nextVal > 10.0 ? 0.0 : nextVal;
      });
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, [claudeStateIndex, currentClaudeState.duration]);

  useEffect(() => {
    const startVal = 31.27;
    setLiveEarnings(startVal);

    const interval = window.setInterval(() => {
      setLiveEarnings((prev) => {
        if (prev === 0) return startVal;
        const increment = 0.01 + Math.random() * 0.02;
        return prev + increment;
      });
    }, 350);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMarket() {
      try {
        const response = await fetch("/api/market", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Market request failed: ${response.status}`);
        }

        const nextMarket = (await response.json()) as MarketResponse;
        if (!cancelled) {
          setMarket(nextMarket);
          setMarketStatus("ready");
          setBidHistory((prev) => {
            const next = appendBidSnapshot(
              prev,
              nextMarket.summary.topCpmCents,
              nextMarket.updatedAtMs ?? Date.now(),
            );
            saveBidHistory(next);
            return next;
          });
        }
      } catch {
        if (!cancelled) {
          setMarketStatus("error");
        }
      }
    }

    void loadMarket();
    const interval = window.setInterval(loadMarket, MARKET_REFRESH_MS);
    const refreshAfterCheckout = () => {
      void loadMarket();
    };
    window.addEventListener(
      CHECKOUT_FUNDED_MARKET_REFRESH_EVENT,
      refreshAfterCheckout,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener(
        CHECKOUT_FUNDED_MARKET_REFRESH_EVENT,
        refreshAfterCheckout,
      );
    };
  }, []);

  const rows = market?.rows ?? [];
  const visibleRows = rows.slice(0, 12);
  const marketPreviewRows = visibleRows.slice(0, 3);
  const topBid = rows[0];
  const sponsorLetter = topBid?.adText ? topBid.adText.trim().charAt(0).toUpperCase() : "R";
  const lastUpdatedLabel = formatUpdatedAt(market?.updatedAtMs, t.market.loadingLiveBidsShort);

  const topBidPrice = topBid?.cpmCents ? topBid.cpmCents / 100 : 0;
  const chartSeries = buildBidChartData(bidHistory, timeframe);
  const chartData = chartSeries?.points ?? [];
  const chartMaxBid = chartData.reduce((max, point) => Math.max(max, point.bid), topBidPrice);

  const bids = market?.rows ?? [];

  // Repeat the bids list to ensure it has enough width to scroll seamlessly
  const tickerItems: { text: string; badge: string }[] = [];
  if (bids.length > 0) {
    const minItems = 15;
    const repetitions = Math.ceil(minItems / bids.length);
    for (let i = 0; i < repetitions; i++) {
      tickerItems.push(...bids.map(b => ({ text: b.adText, badge: b.bidLabel })));
    }
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        {/* Infinite scrolling ticker banner displaying latest bids */}
        {bids.length > 0 && (
          <div className="relative w-full overflow-hidden bg-[#0a0a0b] py-2 border-b border-zinc-900 text-[11px] font-bold font-mono tracking-wider text-zinc-400 select-none">
            <div className="flex animate-marquee whitespace-nowrap">
              <div className="flex shrink-0 items-center gap-12 pr-12">
                {tickerItems.map((item, idx) => (
                  <div key={`ticker-1-${idx}`} className="flex items-center gap-3">
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-400">
                      {item.badge}
                    </span>
                    <span className="text-zinc-300">{item.text}</span>
                    <span className="text-zinc-700">|</span>
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 items-center gap-12 pr-12" aria-hidden="true">
                {tickerItems.map((item, idx) => (
                  <div key={`ticker-2-${idx}`} className="flex items-center gap-3">
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-400">
                      {item.badge}
                    </span>
                    <span className="text-zinc-300">{item.text}</span>
                    <span className="text-zinc-700">|</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="liquid-glass spinshare-static spinshare-home-nav-bar relative mx-auto mt-3 flex h-16 max-w-7xl items-center justify-between rounded-[20px] px-4 backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(180%)] [-webkit-backdrop-filter:blur(24px)_saturate(180%)] sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="SpinShare home">
            <Image
              src="/logo/spinshare-logo.png"
              alt="SpinShare Logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-[8px] object-contain shadow-[0_10px_24px_rgba(22,163,74,0.24)]"
            />
            <SpinShareWordmark className="text-xl" />
          </Link>

          <nav className="spinshare-home-nav pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-10 text-sm font-bold lg:pointer-events-auto lg:flex xl:gap-16">
            <a href="#money">
              {t.nav.money}
            </a>
            <a href="#bid-market">
              {t.nav.marketDepth}
            </a>
            <a href="#how-it-pays">
              {t.nav.howItPays}
            </a>
          </nav>

          <div className="flex items-center gap-1.5">
            <SiteNavAuth variant="landing" />
          </div>
        </div>
      </header>

      <div className="spinshare-home min-h-screen">
        <main className="spinshare-home-frame">
        <section id="money" className="spinshare-home-hero">
          <div className="spinshare-blob-1 pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full blur-3xl animate-pulse-slow" />
          <div className="spinshare-blob-2 pointer-events-none absolute -right-40 -bottom-40 h-96 w-96 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "-5s" }} />
          <div className="spinshare-hero-layout">
            <div className="spinshare-hero-left">
              <div className="spinshare-hero-copy">
              <h1 className="mt-0 max-w-3xl text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
                <span className="block">{t.home.heroLine1}</span>
                <span className="mt-2 flex flex-wrap items-center gap-4">
                  <span className="spinshare-hero-highlight-3d">{t.home.heroHighlight}</span>
                  <MoneyIcon className="text-5xl sm:text-6xl lg:text-7xl" />
                </span>
              </h1>

              <div className="spinshare-home-body mt-6 max-w-xl text-lg font-semibold leading-8">
                <p>{t.home.heroSub}</p>
                <p className="font-black text-[var(--text-accent-strong)]">
                  {t.home.heroShare(DEVELOPER_SHARE_PERCENT)}
                </p>
              </div>
            </div>

            <div className="spinshare-hero-primary-cta mt-11 flex justify-center lg:justify-start">
              <HeroInstallCommand
                command={INSTALL_COMMAND}
                title={t.home.ctaInstall}
                hint={t.home.ctaCommandHint}
                copyLabel={t.setupGuide.copy}
                copiedLabel={t.setupGuide.copied}
              />
            </div>

            <div className="spinshare-hero-secondary-cta spinshare-home-body mx-auto mt-4 flex max-w-3xl flex-col items-center justify-center gap-2 text-sm font-bold sm:flex-row lg:mx-0 lg:justify-start">
              <span>{t.home.creditedRevenue(DEVELOPER_SHARE_PERCENT)}</span>
              <Link
                href={ADVERTISER_SIGNIN_HREF}
                className="spinshare-btn-outline inline-flex items-center gap-2 px-4 py-2 text-[var(--text-accent-strong)]"
              >
                {t.home.advertisersBidCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="spinshare-hero-dashboard">
            <HeroDashboardCard
              monthlyEstimate={liveEarnings}
              liveCampaigns={market?.summary.liveCampaigns}
              totalImpressions={market?.rows.reduce((sum, row) => sum + row.servedImpressions, 0)}
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="spinshare-frame-section spinshare-home-section-muted px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="spinshare-home-label-accent text-xs font-black uppercase tracking-[0.18em]">
              {t.nav.howItPays}
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
              等待过程，如何变现
            </h2>
          </div>

          <div className="spinshare-process-panel spinshare-hero-proof-rail mt-11 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
              <div className="min-w-0">
                <p className="spinshare-home-label mb-3 text-xs font-black uppercase tracking-[0.16em]">
                  {t.home.stockClaude}
                </p>
                <div className="liquid-glass-black border border-zinc-800 p-5 text-left">
                  <div className="flex items-center justify-between font-mono text-sm">
                    <div className="flex items-center gap-3 text-[#DE7356] min-w-0">
                      <span className="grid h-5 w-5 shrink-0 select-none place-items-center text-lg leading-none">
                        {leftIcon}
                      </span>
                      <span className="font-semibold truncate">
                        <span>{currentClaudeState.action}</span>
                        <span className="inline-block w-[3ch] text-left">{".".repeat(sharedDotCount)}</span>
                      </span>
                    </div>
                    <span className="text-zinc-500 text-xs font-semibold shrink-0 pl-2">{currentClaudeState.category} · {leftTimer.toFixed(1)}s</span>
                  </div>
                </div>
              </div>

              <div className="mx-auto flex flex-col items-center justify-center rotate-90 lg:rotate-0 select-none">
                <div className="hidden lg:block h-7" />
                <span className="text-emerald-500 font-black text-5xl tracking-tighter shrink-0 leading-none">»</span>
              </div>

              <div className="min-w-0">
                <p className="spinshare-home-label-accent mb-3 text-xs font-black uppercase tracking-[0.16em]">
                  {t.home.withSpinShare}
                </p>
                <div className="liquid-glass-black border border-emerald-900/35 p-5 text-left">
                  <div className="flex items-center justify-between font-mono text-sm">
                    {/* Left/Middle side: LearnX ad (replaces Claude loader) */}
                    <div className="flex min-w-0 items-center gap-2 text-sm leading-5">
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 rounded-[3px]"
                        height={16}
                        sizes="16px"
                        src="/learnx/favicon-32x32.png"
                        width={16}
                      />
                      <span className="truncate whitespace-nowrap select-none font-semibold text-slate-200">
                        {t.home.learnAdCopy}
                        <span className="inline-block w-[3ch] text-left">{".".repeat(sharedDotCount)}</span>
                      </span>
                    </div>

                    {/* Right side: Category and timer (mirrors left container) */}
                    <span className="text-zinc-500 text-xs font-semibold shrink-0 pl-2">{currentClaudeState.category} · {leftTimer.toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      <section id="bid-market" className="spinshare-frame-section spinshare-home-section-muted px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="spinshare-home-label-accent text-xs font-black uppercase tracking-[0.18em]">
            {t.nav.marketDepth}
          </p>
          <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">
            {t.market.title}
          </h2>
          <p className="spinshare-home-body mt-4 max-w-xl text-base font-semibold leading-7">
            {t.market.subtitle}
          </p>
          <CheckoutStatusBanner />
        </div>

        <div className="spinshare-market-proof-grid mt-10">
          <div className="liquid-glass overflow-hidden flex flex-col">
                {/* Header Row */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 pt-6 pb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">{t.market.bidMarket}</span>
                    <span className="spinshare-home-strong text-3xl font-black">${topBidPrice.toFixed(2)}</span>
                    <span className="spinshare-home-label text-[10px] font-bold tracking-wider uppercase">{t.market.perThousandImps}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <SegmentSlider
                      ariaLabel={t.developerDashboard.chartTimeRangeAria}
                      mini
                      value={timeframe}
                      onChange={setTimeframe}
                      options={[
                        { value: "24h", label: t.market.timeframe24h },
                        { value: "all", label: t.market.timeframeAll },
                      ]}
                    />

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-callout)] bg-[var(--surface-callout)] px-2.5 py-1 text-xs font-black uppercase text-[var(--text-accent-strong)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {t.market.adsLive(market?.summary.liveCampaigns ?? 0)}
                    </span>
                  </div>
                </div>

                <div className="relative px-6 pb-4 pt-1">
                  <div className="h-56 w-full">
                    {mounted && chartSeries && chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{ top: 8, right: 12, left: 0, bottom: 12 }}
                        >
                          <defs>
                            <linearGradient id="colorBid" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="atMs"
                            type="number"
                            domain={[chartSeries.windowStartMs, chartSeries.windowEndMs]}
                            scale="time"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickMargin={8}
                            minTickGap={48}
                            tickFormatter={(value) =>
                              formatChartTime(
                                typeof value === "number" ? value : Number(value),
                                timeframe,
                              )
                            }
                          />
                          <YAxis
                            width={54}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickMargin={6}
                            tickCount={5}
                            domain={[0, (max: number) => Math.max(chartMaxBid * 1.2, 5, Math.ceil(max / 5) * 5)]}
                            tickFormatter={(val) => `$${val.toFixed(2)}`}
                          />
                          <Tooltip
                            labelFormatter={(value) =>
                              formatChartTime(
                                typeof value === "number" ? value : Number(value),
                                timeframe,
                              )
                            }
                            formatter={(value: number) => [`$${value.toFixed(2)}`, t.market.chartBidLabel]}
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                          />
                          <Area
                            type="stepAfter"
                            dataKey="bid"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorBid)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center rounded-xl bg-[var(--surface-empty)] px-6 text-center">
                        <p className="spinshare-home-body text-xs font-semibold">
                          {marketStatus === "loading"
                            ? t.market.loadingLiveBids
                            : t.market.chartCollectingHistory}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto border-t border-[var(--border-subtle)]">
                  <div className="min-w-[720px] p-6">
                    <div className="spinshare-home-table-head grid grid-cols-[32px_minmax(0,1fr)_140px_100px_minmax(160px,1fr)] gap-x-4 gap-y-1 pb-3 pr-2">
                      <div>#</div>
                      <div>{t.market.campaign}</div>
                      <div>{t.market.bidPerThousand}</div>
                      <div>{t.market.totalPaid}</div>
                      <div>{t.market.delivery}</div>
                    </div>

                    {/* Table Body */}
                    {visibleRows.length > 0 ? (
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {visibleRows.map((row) => {
                          const totalPaidCents = row.totalPaidCents;
                          const servedLabel = formatImpressionsCount(row.servedImpressions);
                          const targetLabel = formatImpressionsCount(row.targetImpressions);
                          const pct =
                            row.targetImpressions > 0
                              ? row.servedImpressions / row.targetImpressions
                              : 0;

                          return (
                            <div key={row.id} className="grid grid-cols-[32px_minmax(0,1fr)_140px_100px_minmax(160px,1fr)] gap-x-4 gap-y-1 py-3.5 pr-2 items-center text-sm">
                              <div className="font-bold text-[var(--text-muted)]">{row.rank}</div>
                              <div className="truncate font-semibold text-[var(--text-primary)]" title={row.adText}>{row.adText}</div>
                              <div className="spinshare-home-strong font-black">{row.bidLabel}</div>
                              <div className="spinshare-home-strong font-black tabular-nums">
                                {formatMoney(totalPaidCents)}
                              </div>
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="shrink-0 whitespace-nowrap text-xs font-bold tabular-nums text-[var(--text-muted)]">
                                  {servedLabel}/{targetLabel}
                                </span>
                                <div className="spinshare-home-progress-track min-w-0 flex-1">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{ width: `${Math.min(pct * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-16">
                        <p className="spinshare-home-strong text-sm font-black">
                          {marketStatus === "loading"
                            ? t.market.loadingLiveBids
                            : marketStatus === "error"
                              ? t.market.bidMarketUnavailable
                              : t.market.noFundedBids}
                        </p>
                        <p className="spinshare-home-body mt-1 max-w-sm text-xs font-semibold">
                          {t.market.fundedCampaignsAppear}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            <AdvertiserCheckoutForm />

            <div className="mt-12 liquid-glass-light-green p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="spinshare-home-market-cta-title">
                  {t.market.advertisersMoveMarket}
                </p>
                <p className="spinshare-home-market-cta-body">
                  {t.market.addBudgetCpm}
                </p>
              </div>
              <Link
                href={ADVERTISER_SIGNIN_HREF}
                className="liquid-glass spinshare-home-strong inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-black"
              >
                {t.market.openAdvertiserPortal}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="how-it-pays" className="spinshare-frame-section spinshare-home-section-muted px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl text-[var(--text-primary)]">
                {t.howItPaysSection.title}
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {/* Card 1: Clock / Waiting */}
              <ThreeDCard>
                <div className="threed-card-icon flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/30">
                  <Clock className="h-10 w-10" />
                </div>
                <div className="threed-card-content space-y-1 min-w-0">
                  <h3 className="text-base font-black text-[var(--text-primary)] leading-tight">
                    {t.howItPaysSection.step1Title}
                  </h3>
                  <p className="text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                    {t.howItPaysSection.step1Body}
                  </p>
                </div>
              </ThreeDCard>

              {/* Card 2: Smile 60% */}
              <ThreeDCard>
                <div className="threed-card-icon flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/30">
                  <Smile60Icon className="h-14 w-14" />
                </div>
                <div className="threed-card-content space-y-1 min-w-0">
                  <h3 className="text-base font-black text-[var(--text-primary)] leading-tight">
                    {t.howItPaysSection.step2Title(DEVELOPER_SHARE_PERCENT)}
                  </h3>
                  <p className="text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                    {t.howItPaysSection.step2Body(DEVELOPER_SHARE_PERCENT)}
                  </p>
                </div>
              </ThreeDCard>

              {/* Card 3: Pie Chart */}
              <ThreeDCard>
                <div className="threed-card-icon flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/30">
                  <PieChart className="h-10 w-10" />
                </div>
                <div className="threed-card-content space-y-1 min-w-0">
                  <h3 className="text-base font-black text-[var(--text-primary)] leading-tight">
                    {t.howItPaysSection.step3Title}
                  </h3>
                  <p className="text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                    {t.howItPaysSection.step3Body}
                  </p>
                </div>
              </ThreeDCard>
            </div>
          </div>
        </section>

        {isLocalhost && (
          <section id="top-earners" className="spinshare-frame-section spinshare-home-section-muted px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-3xl text-center mb-11">
                <p className="spinshare-home-label-accent text-xs font-black uppercase tracking-[0.18em]">
                  {t.topEarners.title}
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                  {t.topEarners.title}
                </h2>
                <p className="spinshare-home-body mt-4 text-base font-semibold leading-7">
                  {t.topEarners.subtitle}
                </p>
              </div>

              <ThreeDTableCard>
                <div className="overflow-x-auto">
                  <div className="min-w-[680px] p-6 md:p-8">
                    {/* Table Header */}
                    <div className="spinshare-home-table-head grid grid-cols-[50px_1.5fr_1.2fr_1.2fr_120px] gap-4 pb-4 items-center border-b border-[var(--border-subtle)] text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                      <div>{t.topEarners.rank}</div>
                      <div className="text-right sm:text-left">{t.topEarners.lifetimeEarned}</div>
                      <div className="text-right">{t.topEarners.earningPerHour}</div>
                      <div className="text-right">{t.topEarners.totalHours}</div>
                      <div className="flex justify-center">{t.topEarners.growthTrend}</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {TOP_EARNERS_DATA.map((user) => (
                        <div
                          key={user.rank}
                          className="grid grid-cols-[50px_1.5fr_1.2fr_1.2fr_120px] gap-4 py-4 items-center text-sm hover:bg-emerald-500/5 transition-colors duration-200 px-2 -mx-2 rounded-lg"
                        >
                          <div className="font-black text-lg text-[var(--text-muted)] flex items-center justify-center">
                            {user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : `#${user.rank}`}
                          </div>
                          <div className="font-black text-base text-[var(--text-primary)] text-right sm:text-left tabular-nums">
                            {moneyFormatter.format(user.lifetimeEarned)}
                          </div>
                          <div className="font-bold text-[var(--text-secondary)] text-right tabular-nums">
                            {moneyFormatter.format(user.earningPerHour)}/hr
                          </div>
                          <div className="font-bold text-[var(--text-secondary)] text-right tabular-nums">
                            {user.totalHours.toLocaleString(undefined, { minimumFractionDigits: 1 })} hrs
                          </div>
                          <div className="flex justify-center items-center h-8">
                            <Sparkline data={user.history} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ThreeDTableCard>
            </div>
          </section>
        )}

        <section className="spinshare-frame-section spinshare-home-section-muted px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="spinshare-home-label-accent text-xs font-black uppercase tracking-[0.18em]">
                {t.bottomCta.eyebrow}
              </p>
              <h2 className="mt-2 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">
                {t.bottomCta.title}
              </h2>
            </div>
            <Link
              href={DEVELOPER_SIGNIN_HREF}
              className="spinshare-btn-primary inline-flex min-h-14 items-center justify-center gap-3 rounded-full px-6 text-base text-white"
            >
              <MoneyIcon />
              {t.home.ctaEarning}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="spinshare-home-footer px-4 py-8 sm:px-6">
        <div className="liquid-glass spinshare-static mx-auto flex max-w-7xl flex-col gap-4 rounded-[20px] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo/spinshare-logo.png"
              alt="SpinShare Logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-[8px] object-contain"
            />
            <SpinShareWordmark />
          </div>
          <p>&copy; 2026 SpinShare. {t.home.footerCopy}</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/signin?role=developer">
              {t.nav.userLogin}
            </Link>
            <Link href="/privacy">
              {t.footer.privacy}
            </Link>
            <Link href="/terms">
              {t.footer.terms}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
