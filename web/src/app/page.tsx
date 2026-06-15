"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SegmentSlider } from "@/components/SegmentSlider";
import AdvertiserCheckoutForm from "./advertiser-checkout-form";
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

function computeCampaignTotalPaidCents(
  remainingBudgetCents: number,
  servedImpressions: number,
  cpmCents: number,
): number {
  const spentCents = Math.floor((servedImpressions * cpmCents) / 1000);
  return remainingBudgetCents + spentCents;
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
    const startVal = 20 + Math.random() * 5;
    setLiveEarnings(startVal);

    const interval = window.setInterval(() => {
      setLiveEarnings((prev) => {
        if (prev === 0) return startVal;
        const increment = 0.015 + Math.random() * 0.03;
        return prev + increment;
      });
    }, 333);

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

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const rows = market?.rows ?? [];
  const visibleRows = rows.slice(0, 12);
  const topBid = rows[0];
  const sponsorLetter = topBid?.adText ? topBid.adText.trim().charAt(0).toUpperCase() : "R";
  const monthlyEstimateLabel = `${moneyFormatter.format(liveEarnings)}${t.home.monthlyEstimateSuffix}`;
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
    <div className="spinshare-home min-h-screen">
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

      <main>
        <section id="money" className="spinshare-home-hero">
          <div className="spinshare-blob-1 pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full blur-3xl animate-pulse-slow" />
          <div className="spinshare-blob-2 pointer-events-none absolute -right-40 -bottom-40 h-96 w-96 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "-5s" }} />
          <div className="relative mx-auto max-w-7xl px-4 pt-32 pb-12 sm:px-6 sm:pt-36 sm:pb-16 lg:pt-40 lg:pb-20">
            <div className="mx-auto max-w-5xl text-center">


              <h1 className="mx-auto mt-0 max-w-5xl text-5xl font-black leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
                <span className="block">{t.home.heroLine1}</span>
                <span className="mt-2 flex flex-wrap items-center justify-center gap-4">
                  <span className="spinshare-hero-highlight-3d">{t.home.heroHighlight}</span>
                  <MoneyIcon className="text-6xl sm:text-7xl lg:text-8xl" />
                </span>
              </h1>

              <div className="spinshare-home-body mx-auto mt-6 max-w-2xl text-lg font-semibold leading-8">
                <p>{t.home.heroSub}</p>
                <p className="font-black text-[var(--text-accent-strong)]">
                  {t.home.heroShare(DEVELOPER_SHARE_PERCENT)}
                </p>
              </div>
            </div>

            <div className="mx-auto mt-11 grid max-w-5xl items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
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

            <div className="mt-11 flex justify-center">
              <Link
                href={DEVELOPER_SIGNIN_HREF}
                className="spinshare-btn-primary group flex w-full max-w-3xl flex-col items-stretch gap-3 rounded-full p-3 text-white sm:flex-row sm:items-center"
              >
                <span className="liquid-glass-light-green grid h-14 w-14 shrink-0 place-items-center rounded-full text-3xl text-[var(--text-accent-strong)]">
                  <MoneyIcon />
                </span>
                <span className="min-w-0 flex-1 px-1 text-left">
                  <span className="block text-xl font-black leading-tight">
                    {t.home.ctaInstall}
                  </span>
                  <span className="mt-1 block text-sm font-bold text-emerald-50">
                    {t.home.ctaInstallSub}
                  </span>
                </span>
                <span className="liquid-glass-light-green inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-black text-[var(--text-accent-strong)]">
                  {monthlyEstimateLabel}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </div>

            <div className="spinshare-home-body mx-auto mt-4 flex max-w-3xl flex-col items-center justify-center gap-2 text-sm font-bold sm:flex-row">
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
        </section>

        <section id="bid-market" className="spinshare-home-section-alt px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div>
              <p className="spinshare-home-label-accent text-xs font-black uppercase tracking-[0.18em]">
                {t.nav.marketDepth}
              </p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">
                {t.market.title}
              </h2>
              <p className="spinshare-home-body mt-4 max-w-xl text-base font-semibold leading-7">
                {t.market.subtitle}
              </p>
            </div>

            <div className="mt-8">
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
                          const totalPaidCents = computeCampaignTotalPaidCents(
                            row.remainingBudgetCents,
                            row.servedImpressions,
                            row.cpmCents,
                          );
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

        <section id="how-it-pays" className="spinshare-home-section-warm px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="spinshare-home-label-accent text-xs font-black uppercase tracking-[0.18em]">
                {t.nav.howItPays}
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                {t.howItPaysSection.title}
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="liquid-glass p-6">
                <div className="spinshare-home-step-icon">
                  <MoneyIcon />
                </div>
                <h3 className="mt-5 text-xl font-black">{t.howItPaysSection.step1Title}</h3>
                <p className="spinshare-home-body mt-2 text-sm font-semibold leading-6">
                  {t.howItPaysSection.step1Body}
                </p>
              </div>

              <div className="liquid-glass p-6">
                <div className="spinshare-home-step-icon">
                  <MoneyIcon />
                </div>
                <h3 className="mt-5 text-xl font-black">{t.howItPaysSection.step2Title}</h3>
                <p className="spinshare-home-body mt-2 text-sm font-semibold leading-6">
                  {t.howItPaysSection.step2Body}
                </p>
              </div>

              <div className="liquid-glass p-6">
                <div className="spinshare-home-step-icon">
                  <MoneyIcon />
                </div>
                <h3 className="mt-5 text-xl font-black">{t.howItPaysSection.step3Title(DEVELOPER_SHARE_PERCENT)}</h3>
                <p className="spinshare-home-body mt-2 text-sm font-semibold leading-6">
                  {t.howItPaysSection.step3Body}
                </p>
                <p className="spinshare-home-label-accent mt-2 text-xs font-black uppercase tracking-[0.14em]">
                  {t.howItPaysSection.minViewSeconds}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="spinshare-home-section-muted px-4 py-16 sm:px-6 lg:py-20">
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
  );
}
