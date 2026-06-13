"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, RefreshCw } from "lucide-react";

import LoadingStatus, { LOADING_ICONS } from "@/components/LoadingStatus";

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

const CLAUDE_STATES = [
  { action: "Conjuring", category: "Bash", duration: 3.1 },
  { action: "Noodling", category: "Glob", duration: 1.4 },
  { action: "Baking", category: "Write", duration: 0.9 },
  { action: "Thinking", category: "Read", duration: 2.2 },
] as const;

export default function HomePage() {
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>("loading");
  const [liveEarnings, setLiveEarnings] = useState<number>(0);
  const [claudeStateIndex, setClaudeStateIndex] = useState<number>(0);
  const [leftTimer, setLeftTimer] = useState<number>(0.0);
  const [rightTimer, setRightTimer] = useState<number>(0.0);
  const [dotCount, setDotCount] = useState<number>(1);

  const currentClaudeState = CLAUDE_STATES[claudeStateIndex] ?? CLAUDE_STATES[0];

  const leftElapsedMs = Math.round(leftTimer * 1000);
  const leftIconIndex = Math.floor(leftElapsedMs / 125) % LOADING_ICONS.length;
  const leftIcon = LOADING_ICONS[leftIconIndex] ?? "\u2736";

  const rightElapsedMs = Math.round(rightTimer * 1000);
  const rightIconIndex = Math.floor(rightElapsedMs / 125) % LOADING_ICONS.length;
  const rightIcon = LOADING_ICONS[rightIconIndex] ?? "\u2736";

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
      setDotCount((prev) => (prev % 3) + 1);
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
        const increment = 0.01 + Math.random() * 0.02;
        return prev + increment;
      });
    }, 500);

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

  return (
    <div className="min-h-screen bg-[#edf7f0] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-[#edf7f0]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="SpinShare home">
            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-emerald-600 text-sm font-black text-white shadow-[0_10px_24px_rgba(22,163,74,0.24)]">
              S$
            </span>
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
              className="hidden rounded-[8px] px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-emerald-700 sm:inline-flex"
            >
              User login
            </Link>
            <Link
              href={DEVELOPER_SIGNIN_HREF}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-600/25 bg-emerald-600/10 backdrop-blur-md px-5 text-sm font-black text-emerald-800 shadow-[0_4px_12px_rgba(16,185,129,0.06)] transition hover:bg-emerald-600/20 hover:border-emerald-600/40"
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
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-5xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/20 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
                <MoneyIcon />
                Live wait-state marketplace
              </div>

              <h1 className="mx-auto mt-7 max-w-5xl text-5xl font-black leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
                <span className="block">Your AI thinks</span>
                <span className="mt-2 flex flex-wrap items-center justify-center gap-4">
                  <span>You get</span>
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
                <div className="rounded-2xl border border-zinc-800 bg-[#141415] p-5 text-left shadow-[0_20px_52px_rgba(15,23,42,0.18)]">
                  <div className="flex items-center justify-between font-mono text-sm">
                    <div className="flex items-center gap-3 text-[#c15f3c] min-w-0">
                      <span className="grid h-5 w-5 shrink-0 select-none place-items-center text-lg leading-none">
                        {leftIcon}
                      </span>
                      <span className="font-semibold truncate">
                        <span>{currentClaudeState.action}</span>
                        <span className="inline-block w-[2.25ch] text-left">{".".repeat(dotCount)}</span>
                      </span>
                    </div>
                    <span className="text-zinc-500 text-xs font-semibold shrink-0 pl-2">{currentClaudeState.category} · {leftTimer.toFixed(1)}s</span>
                  </div>
                </div>
              </div>

              <div className="mx-auto flex flex-col items-center justify-center rotate-90 lg:rotate-0 select-none">
                <div className="hidden lg:block h-7" />
                <span className="text-emerald-500 font-black text-2xl tracking-tighter shrink-0">»</span>
              </div>

              <div className="min-w-0">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  With SpinShare
                </p>
                <div className="rounded-2xl border border-emerald-900/35 bg-[#141415] p-5 text-left shadow-[0_20px_52px_rgba(16,185,129,0.1)]">
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
                      </span>
                    </div>

                    {/* Right side: Category and timer */}
                    <span className="text-zinc-500 text-xs font-semibold shrink-0 pl-2">Edit · {rightTimer.toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-11 flex justify-center">
              <Link
                href={DEVELOPER_SIGNIN_HREF}
                className="group flex w-full max-w-3xl flex-col items-stretch gap-3 rounded-full bg-emerald-600 p-3 text-white shadow-[0_24px_58px_rgba(22,163,74,0.3)] transition hover:-translate-y-0.5 hover:bg-emerald-700 sm:flex-row sm:items-center"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-3xl text-emerald-700">
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
                <span className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-emerald-700">
                  {monthlyEstimateLabel}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </div>

            <div className="mx-auto mt-4 flex max-w-3xl flex-col items-center justify-center gap-2 text-sm font-bold text-slate-500 sm:flex-row">
              <span>{DEVELOPER_SHARE_PERCENT}% credited revenue to you.</span>
              <Link
                href={ADVERTISER_SIGNIN_HREF}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-700/20 bg-white px-4 py-2 font-black text-emerald-700 shadow-sm transition hover:border-emerald-500"
              >
                Advertisers bid into the next wait
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="bid-market" className="bg-[#f8fbf9] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
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

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="liquid-glass p-4 text-left">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Top CPM
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight">
                    {marketStatus === "ready"
                      ? market?.summary.topCpmUsd ?? "$0.00"
                      : "Loading"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    per 1,000 waits
                  </p>
                </div>

                <div className="liquid-glass p-4 text-left">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Monthly take
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight">
                    {monthlyEstimateLabel}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    based on current wait volume
                  </p>
                </div>

                <div className="liquid-glass p-4 text-left">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Funded bids
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight">
                    {marketStatus === "ready"
                      ? market?.summary.liveCampaigns ?? 0
                      : "Loading"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    self-updating
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="overflow-hidden liquid-glass flex flex-col h-[480px]">
                <div className="flex items-center justify-between gap-3 border-b border-emerald-900/10 bg-[#edf7f0]/30 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 shrink-0">
                  <span>Live bid market</span>
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {lastUpdatedLabel}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                  {visibleRows.length > 0 ? (
                    visibleRows.map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-emerald-900/5 bg-white/60 hover:bg-white/90 hover:border-emerald-600/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200"
                      >
                        {/* Left Side: Rank and Campaign Text */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black
                            ${row.rank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-200 shadow-sm font-bold' :
                              row.rank === 2 ? 'bg-slate-150 text-slate-700 border border-slate-300' :
                              row.rank === 3 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                              'bg-emerald-50 text-emerald-700'}`}
                          >
                            #{row.rank}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-950 truncate text-sm sm:text-base" title={row.adText}>
                              {row.adText}
                            </p>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              Remaining Budget: <span className="font-bold text-slate-700">{row.remainingBudgetUsd}</span>
                            </p>
                          </div>
                        </div>

                        {/* Right Side: Bid Value & Live Tag */}
                        <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
                          <div className="text-left sm:text-right">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-black text-emerald-700 border border-emerald-600/10">
                              <MoneyIcon className="text-sm" />
                              {row.bidLabel}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black uppercase text-emerald-700 border border-emerald-600/10">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <p className="text-lg font-black text-slate-950">
                        {marketStatus === "loading"
                          ? "Loading live bids"
                          : marketStatus === "error"
                            ? "Bid market is temporarily unavailable"
                            : "No funded bids live yet"}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-500 max-w-sm">
                        Funded advertiser campaigns will appear here automatically.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-700/20 bg-emerald-50/50 backdrop-blur-md p-5 sm:flex-row sm:items-center sm:justify-between transition-all hover:bg-emerald-50/70">
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
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
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
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-emerald-600 px-6 text-base font-black text-white shadow-[0_18px_44px_rgba(22,163,74,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              <MoneyIcon />
              Start earning
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-emerald-900/10 bg-[#f8fbf9] px-4 py-8 text-sm font-semibold text-slate-500 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-emerald-600 text-xs font-black text-white">
              S$
            </span>
            <span className="font-black text-slate-950">SpinShare</span>
          </div>
          <p>&copy; 2026 SpinShare. Paid wait states for AI coding tools.</p>
          <div className="flex gap-5">
            <Link href={ADVERTISER_SIGNIN_HREF} className="transition hover:text-emerald-700">
              Advertisers
            </Link>
            <Link href="/signin?role=developer" className="transition hover:text-emerald-700">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
