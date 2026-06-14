"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, RefreshCw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import AdvertiserCheckoutForm from "./advertiser-checkout-form";
import LoadingStatus, { LOADING_ICONS, LOADING_VERBS } from "@/components/LoadingStatus";

const DEVELOPER_SIGNIN_HREF =
  "/signin?role=developer&callbackUrl=%2Fdashboard%2Fdeveloper";
const ADVERTISER_SIGNIN_HREF =
  "/signin?role=advertiser&callbackUrl=%2Fdashboard%2Fadvertiser";

const MARKET_REFRESH_MS = 15_000;
const DEVELOPER_SHARE_PERCENT = 60;

interface MarketRow {
  id: string;
  rank: number;
  adText: string;
  cpmCents: number;
  cpmUsd: string;
  bidLabel: string;
  remainingBudgetCents: number;
  remainingBudgetUsd: string;
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

function formatUpdatedAt(updatedAtMs: number | undefined): string {
  if (!updatedAtMs) return "Loading live bids";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(updatedAtMs);
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

function getCampaignStats(campaignId: string) {
  let hash = 0;
  for (let i = 0; i < campaignId.length; i++) {
    hash = campaignId.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const targets = [1000, 2000, 5000, 7000, 10000, 20000, 32000, 34000, 45000, 200000];
  const target = targets[hash % targets.length] ?? 10000;

  // pct between 0% and 80%
  const pct = (hash % 80) / 100;
  const served = Math.round(target * pct);

  return { served, target };
}

function formatImpressionsCount(val: number): string {
  if (val === 0) return "0";
  if (val >= 1000) {
    const k = val / 1000;
    return `${k.toFixed(1).replace(".0", "")}k`;
  }
  return val.toString();
}

function generateChartData(topBid: number, timeframe: "24h" | "all") {
  const multipliers24h = [
    { time: "13:08", mult: 2.54 },
    { time: "13:40", mult: 3.18 },
    { time: "14:10", mult: 2.00 },
    { time: "14:30", mult: 4.18 },
    { time: "14:45", mult: 1.90 },
    { time: "14:55", mult: 2.27 },
    { time: "15:40", mult: 2.27 },
    { time: "16:10", mult: 2.45 },
    { time: "16:49", mult: 2.91 },
    { time: "17:30", mult: 2.91 },
    { time: "18:00", mult: 2.82 },
    { time: "18:30", mult: 2.91 },
    { time: "18:54", mult: 2.27 },
    { time: "19:40", mult: 2.27 },
    { time: "20:20", mult: 2.00 },
    { time: "21:00", mult: 2.91 },
    { time: "21:30", mult: 2.45 },
    { time: "21:48", mult: 2.00 },
    { time: "22:40", mult: 2.27 },
    { time: "23:30", mult: 2.00 },
    { time: "0:40", mult: 1.82 },
    { time: "1:41", mult: 1.82 },
    { time: "2:20", mult: 1.09 },
    { time: "3:00", mult: 0.63 },
    { time: "4:00", mult: 0.63 },
    { time: "4:40", mult: 1.09 },
    { time: "5:24", mult: 0.63 },
    { time: "6:20", mult: 0.63 },
    { time: "7:00", mult: 0.82 },
    { time: "8:00", mult: 0.82 },
    { time: "8:59", mult: 1.00 },
  ];

  const multipliersAll = [
    { time: "Mon", mult: 1.82 },
    { time: "Tue", mult: 2.27 },
    { time: "Wed", mult: 2.91 },
    { time: "Thu", mult: 1.90 },
    { time: "Fri", mult: 3.18 },
    { time: "Sat", mult: 2.45 },
    { time: "Sun", mult: 1.00 },
  ];

  const list = timeframe === "24h" ? multipliers24h : multipliersAll;

  return list.map((item) => ({
    time: item.time,
    bid: parseFloat((item.mult * topBid).toFixed(2)),
  }));
}

export default function HomePage() {
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>("loading");
  const [timeframe, setTimeframe] = useState<"24h" | "all">("24h");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [liveEarnings, setLiveEarnings] = useState<number>(0);
  const [claudeStateIndex, setClaudeStateIndex] = useState<number>(0);
  const [leftTimer, setLeftTimer] = useState<number>(0.0);
  const [rightTimer, setRightTimer] = useState<number>(0.0);

  const currentClaudeState = CLAUDE_STATES[claudeStateIndex] ?? CLAUDE_STATES[0]!;

  const leftElapsedMs = Math.round(leftTimer * 1000);
  const leftIconIndex = Math.floor(leftElapsedMs / 250) % LOADING_ICONS.length;
  const leftIcon = LOADING_ICONS[leftIconIndex] ?? "\u2722";

  const rightElapsedMs = Math.round(rightTimer * 1000);
  const sharedDotCount = Math.floor(rightElapsedMs / 250) % 4;

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
        const increment = 0.03 + Math.random() * 0.06;
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
  const monthlyEstimateLabel = `${moneyFormatter.format(liveEarnings)}/mo`;
  const lastUpdatedLabel = formatUpdatedAt(market?.updatedAtMs);

  const topBidPrice = topBid?.cpmCents ? topBid.cpmCents / 100 : 11.0;
  const chartData = generateChartData(topBidPrice, timeframe);
  const fleetRateVal = marketStatus === "ready" && market ? (market.summary.liveCampaigns * 0.6).toFixed(1).replace(".0", "") : "9";
  const fleetRate = `${fleetRateVal}k`;

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
    <div className="min-h-screen bg-[#e8f6ed] text-slate-950">
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

        <div className="liquid-glass spinshare-static mx-auto mt-3 flex h-16 max-w-7xl items-center justify-between rounded-[20px] bg-white/55 px-4 backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(180%)] [-webkit-backdrop-filter:blur(24px)_saturate(180%)] sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="SpinShare home">
            <Image
              src="/logo/spinshare-logo.png"
              alt="SpinShare Logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-[8px] object-contain shadow-[0_10px_24px_rgba(22,163,74,0.24)]"
            />
            <span className="text-xl font-black tracking-tight">SpinShare</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <a href="#money" className="transition hover:text-emerald-700">
              Money
            </a>
            <a href="#bid-market" className="transition hover:text-emerald-700">
              Market depth
            </a>
            <a href="#how-it-pays" className="transition hover:text-emerald-700">
              How it pays
            </a>
            <Link href={ADVERTISER_SIGNIN_HREF} className="transition hover:text-emerald-700">
              Advertisers
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/signin?role=developer"
              className="spinshare-btn-outline inline-flex h-10 items-center px-3 text-sm sm:px-4"
            >
              <span className="sm:hidden">Login</span>
              <span className="hidden sm:inline">User login</span>
            </Link>
            <Link
              href={DEVELOPER_SIGNIN_HREF}
              className="spinshare-btn-primary inline-flex h-10 items-center gap-2 px-4 text-sm sm:px-5"
            >
              <MoneyIcon />
              Install
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="money" className="relative overflow-hidden border-b border-emerald-900/10 bg-[#e8f6ed]">
          <div className="spinshare-blob-1 pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full blur-3xl animate-pulse-slow" />
          <div className="spinshare-blob-2 pointer-events-none absolute -right-40 -bottom-40 h-96 w-96 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "-5s" }} />
          <div className="relative mx-auto max-w-7xl px-4 pt-32 pb-12 sm:px-6 sm:pt-36 sm:pb-16 lg:pt-40 lg:pb-20">
            <div className="mx-auto max-w-5xl text-center">


              <h1 className="mx-auto mt-0 max-w-5xl text-5xl font-black leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
                <span className="block">Your AI thinks</span>
                <span className="mt-2 flex flex-wrap items-center justify-center gap-4">
                  <span className="spinshare-hero-highlight-3d">You get</span>
                  <MoneyIcon className="text-6xl sm:text-7xl lg:text-8xl" />
                </span>
              </h1>

              <div className="mx-auto mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
                <p>SpinShare turns idle AI waits into paid moments.</p>
                <p className="font-black text-emerald-700">
                  {DEVELOPER_SHARE_PERCENT}% of revenue goes to you.
                </p>
              </div>
            </div>

            <div className="mx-auto mt-11 grid max-w-5xl items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
              <div className="min-w-0">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Stock Claude Code
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
                <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  With SpinShare
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
                        LearnX · Know exactly what to study
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
                <span className="liquid-glass-light-green grid h-14 w-14 shrink-0 place-items-center rounded-full text-3xl text-emerald-700">
                  <MoneyIcon />
                </span>
                <span className="min-w-0 flex-1 px-1 text-left">
                  <span className="block text-xl font-black leading-tight">
                    Install and start earning
                  </span>
                  <span className="mt-1 block text-sm font-bold text-emerald-50">
                    Money starts on the next eligible wait
                  </span>
                </span>
                <span className="liquid-glass-light-green inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-black text-emerald-800">
                  {monthlyEstimateLabel}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </div>

            <div className="mx-auto mt-4 flex max-w-3xl flex-col items-center justify-center gap-2 text-sm font-bold text-slate-500 sm:flex-row">
              <span>{DEVELOPER_SHARE_PERCENT}% credited revenue to you.</span>
              <Link
                href={ADVERTISER_SIGNIN_HREF}
                className="spinshare-btn-outline inline-flex items-center gap-2 px-4 py-2 text-emerald-700"
              >
                Advertisers bid into the next wait
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="bid-market" className="bg-[#f8fbf9] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Market depth
              </p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">
                Advertiser money lines up for the next wait.
              </h2>
              <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-slate-600">
                The highest funded CPM wins placement. You see money, not mystery.
              </p>
            </div>

            <div className="mt-8">
              <div className="liquid-glass overflow-hidden flex flex-col">
                {/* Header Row */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 pt-6 pb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Bid Market</span>
                    <span className="text-3xl font-black text-slate-950">${topBidPrice.toFixed(2)}</span>
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">per 1,000 impressions</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold text-slate-600">
                      <button
                        onClick={() => setTimeframe("24h")}
                        className={`rounded-md px-3 py-1.5 transition-all ${
                          timeframe === "24h"
                            ? "bg-white text-emerald-800 shadow-sm font-black"
                            : "hover:text-slate-950"
                        }`}
                      >
                        24H
                      </button>
                      <button
                        onClick={() => setTimeframe("all")}
                        className={`rounded-md px-3 py-1.5 transition-all ${
                          timeframe === "all"
                            ? "bg-white text-emerald-800 shadow-sm font-black"
                            : "hover:text-slate-950"
                        }`}
                      >
                        ALL
                      </button>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black uppercase text-emerald-700 border border-emerald-600/10">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {market?.summary.liveCampaigns ?? 0} Ads Live
                    </span>
                  </div>
                </div>

                {/* Chart Section */}
                <div className="relative px-6 py-2">
                  {/* Floating Badge */}
                  <div className="absolute top-4 right-8 z-10 rounded-full border border-slate-100 bg-white/95 backdrop-blur px-3 py-1 text-xs font-mono font-bold text-slate-600 shadow-sm flex items-center gap-2">
                    <span className="text-emerald-600 font-extrabold">{fleetRate}</span> imps/min across the fleet
                  </div>
                  {/* Chart */}
                  <div className="h-52 w-full">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorBid" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="time"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            domain={[0, (max: number) => Math.max(45, Math.ceil(max / 5) * 5)]}
                            tickFormatter={(val) => `$${val.toFixed(2)}`}
                          />
                          <Tooltip
                            formatter={(value: number) => [`$${value.toFixed(2)}`, "Bid"]}
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
                      <div className="h-full w-full bg-slate-50 animate-pulse rounded-xl" />
                    )}
                  </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto border-t border-emerald-900/10">
                  <div className="min-w-[700px] p-6">
                    {/* Table Header */}
                    <div className="grid grid-cols-[40px_1fr_180px_240px] gap-4 border-b border-emerald-900/10 pb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                      <div>#</div>
                      <div>Campaign</div>
                      <div>Bid / 1,000 Imps</div>
                      <div>Impressions</div>
                    </div>

                    {/* Table Body */}
                    {visibleRows.length > 0 ? (
                      <div className="divide-y divide-emerald-900/5">
                        {visibleRows.map((row) => {
                          const stats = getCampaignStats(row.id);
                          const servedLabel = formatImpressionsCount(stats.served);
                          const targetLabel = formatImpressionsCount(stats.target);
                          const pct = stats.target > 0 ? stats.served / stats.target : 0;

                          return (
                            <div key={row.id} className="grid grid-cols-[40px_1fr_180px_240px] gap-4 py-3.5 items-center text-sm">
                              <div className="font-bold text-slate-400">{row.rank}</div>
                              <div className="font-semibold text-slate-900 truncate" title={row.adText}>{row.adText}</div>
                              <div className="font-black text-slate-950">{row.bidLabel}</div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 w-16 tabular-nums">{servedLabel} / {targetLabel}</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct * 100}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-16">
                        <p className="text-sm font-black text-slate-950">
                          {marketStatus === "loading"
                            ? "Loading live bids..."
                            : marketStatus === "error"
                              ? "Bid market is temporarily unavailable"
                              : "No funded bids live yet"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 max-w-sm">
                          Funded advertiser campaigns will appear here automatically.
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
                <p className="font-black text-emerald-950">
                  Advertisers can move this market.
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-800">
                  Add budget and a higher CPM to win the next wait-state placement.
                </p>
              </div>
              <Link
                href={ADVERTISER_SIGNIN_HREF}
                className="liquid-glass inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-black text-slate-950"
              >
                Open advertiser portal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section
          id="how-it-pays"
          className="border-y border-emerald-900/10 bg-[#eef9f3] px-4 py-16 text-slate-950 sm:px-6 lg:py-20"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                How it pays
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                Money moves in three short steps.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="liquid-glass p-6">
                <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-emerald-50 text-2xl">
                  <MoneyIcon />
                </div>
                <h3 className="mt-5 text-xl font-black">1. Your AI pauses</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  The extension asks for the current winning campaign when the agent hits a wait state.
                </p>
              </div>

              <div className="liquid-glass p-6">
                <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-emerald-50 text-2xl">
                  <MoneyIcon />
                </div>
                <h3 className="mt-5 text-xl font-black">2. Money appears</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  The winning advertiser line displays during the wait, with no source upload required.
                </p>
              </div>

              <div className="liquid-glass p-6">
                <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-emerald-50 text-2xl">
                  <MoneyIcon />
                </div>
                <h3 className="mt-5 text-xl font-black">3. You keep 60%</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Credited impressions flow to your ledger with payout limits and fraud review protecting the exchange.
                </p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                  3-second minimum views
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#edf7f0] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Next paid wait
              </p>
              <h2 className="mt-2 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">
                Put advertiser money under your spinner.
              </h2>
            </div>
            <Link
              href={DEVELOPER_SIGNIN_HREF}
              className="spinshare-btn-primary inline-flex min-h-14 items-center justify-center gap-3 rounded-full px-6 text-base text-white"
            >
              <MoneyIcon />
              Start earning
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-emerald-900/10 px-4 py-8 text-sm font-semibold text-slate-500 sm:px-6">
        <div className="liquid-glass mx-auto flex max-w-7xl flex-col gap-4 rounded-[20px] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo/spinshare-logo.png"
              alt="SpinShare Logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-[8px] object-contain"
            />
            <span className="font-black text-slate-950">SpinShare</span>
          </div>
          <p>&copy; 2026 SpinShare. Paid wait states for AI coding tools.</p>
          <div className="flex gap-5">
            <Link href="/signin?role=developer" className="text-slate-500">
              Login
            </Link>
            <Link href="/privacy" className="text-slate-500">
              Privacy
            </Link>
            <Link href="/terms" className="text-slate-500">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
