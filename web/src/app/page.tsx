"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Clock3,
  Code2,
  DollarSign,
  Download,
  Megaphone,
  Radio,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const DEVELOPER_SIGNIN_HREF =
  "/signin?role=developer&callbackUrl=%2Fdashboard%2Fdeveloper";
const ADVERTISER_SIGNIN_HREF =
  "/signin?role=advertiser&callbackUrl=%2Fdashboard%2Fadvertiser";

const MARKET_REFRESH_MS = 15_000;
const DEVELOPER_SHARE_PERCENT = 60;
const DEFAULT_WAITS_PER_HOUR = 120;

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

function estimateHourlyCents(topCpmCents: number, waitsPerHour: number): number {
  return Math.round(
    (topCpmCents * waitsPerHour * DEVELOPER_SHARE_PERCENT) / 100_000,
  );
}

function formatUpdatedAt(updatedAtMs: number | undefined): string {
  if (!updatedAtMs) return "Loading live bids";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(updatedAtMs);
}

export default function HomePage() {
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>("loading");
  const [waitsPerHour, setWaitsPerHour] = useState(DEFAULT_WAITS_PER_HOUR);

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
  const topCpmCents = market?.summary.topCpmCents ?? 0;
  const hourlyEstimateCents = useMemo(
    () => estimateHourlyCents(topCpmCents, waitsPerHour),
    [topCpmCents, waitsPerHour],
  );
  const topBidLabel =
    marketStatus === "loading"
      ? "Loading live bids"
      : marketStatus === "error"
        ? "Market temporarily unavailable"
        : topBid
          ? `${topBid.cpmUsd} top CPM`
          : "No funded bids yet";
  const lastUpdatedLabel = formatUpdatedAt(market?.updatedAtMs);

  return (
    <div className="min-h-screen bg-[#edf7f0] text-slate-950 [font-family:Aptos,'Segoe_UI',ui-sans-serif,system-ui,sans-serif]">
      <header className="border-b border-emerald-900/10 bg-[#edf7f0]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="SpinShare home">
            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-emerald-600 text-sm font-black text-white shadow-[0_10px_24px_rgba(22,163,74,0.24)]">
              S$
            </span>
            <span className="text-xl font-black tracking-tight">SpinShare</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <a href="#bid-market" className="transition hover:text-emerald-700">
              Bid market
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
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-emerald-600 px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(22,163,74,0.22)] transition hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              Install
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-emerald-900/10 bg-[#e8f6ed]">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-[8px] border border-emerald-700/20 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                <Radio className="h-4 w-4" />
                Live wait-state marketplace
              </div>

              <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.96] tracking-tight sm:text-7xl">
                Earn from every AI wait.
              </h1>

              <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
                SpinShare turns idle agent time into paid ad inventory. Install once, show developer-relevant bids during waits, and keep 60% of credited revenue.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[8px] border border-emerald-900/10 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Live top bid
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight">
                    {marketStatus === "ready"
                      ? market?.summary.topCpmUsd ?? "$0.00"
                      : "Loading"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">per 1,000 waits</p>
                </div>

                <div className="rounded-[8px] border border-emerald-900/10 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Estimated take
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight">
                    {marketStatus === "ready" ? `${formatMoney(hourlyEstimateCents)}/hr` : "Loading"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    at {waitsPerHour} waits/hour
                  </p>
                </div>

                <div className="rounded-[8px] border border-emerald-900/10 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Funded bids
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight">
                    {marketStatus === "ready"
                      ? market?.summary.liveCampaigns ?? 0
                      : "Loading"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">self-updating</p>
                </div>
              </div>

              <div className="mt-6 max-w-xl rounded-[8px] border border-emerald-900/10 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="waitsPerHour"
                    className="text-sm font-black text-slate-800"
                  >
                    Paid waits per hour
                  </label>
                  <span className="font-mono text-sm font-black text-emerald-700">
                    {waitsPerHour}
                  </span>
                </div>
                <input
                  id="waitsPerHour"
                  type="range"
                  min="20"
                  max="300"
                  step="10"
                  value={waitsPerHour}
                  onChange={(event) => setWaitsPerHour(Number(event.target.value))}
                  className="mt-3 h-2 w-full accent-emerald-600"
                />
              </div>

              <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center">
                <Link
                  href={DEVELOPER_SIGNIN_HREF}
                  className="group grid w-full max-w-xl grid-cols-[auto_1fr] items-center gap-3 rounded-[8px] bg-emerald-600 p-4 text-white shadow-[0_22px_50px_rgba(22,163,74,0.28)] transition hover:-translate-y-0.5 hover:bg-emerald-700 sm:grid-cols-[auto_1fr_auto]"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-white text-emerald-700">
                    <Download className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-lg font-black leading-tight">
                      Install the VS Code extension
                    </span>
                    <span className="mt-1 block text-sm font-bold text-emerald-50">
                      Start earning from your next agent wait
                    </span>
                  </span>
                  <span className="col-span-2 inline-flex items-center justify-between gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-black text-emerald-700 sm:col-span-1 sm:justify-self-end">
                    {topBidLabel}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>

                <Link
                  href={ADVERTISER_SIGNIN_HREF}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[8px] border border-slate-300 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:border-emerald-500 hover:text-emerald-700 lg:w-auto"
                >
                  <Megaphone className="h-4 w-4" />
                  Advertisers: bid on this line
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="min-w-0">
              <div className="overflow-hidden rounded-[8px] border border-slate-900/10 bg-[#101713] text-white shadow-[0_26px_70px_rgba(15,23,42,0.22)]">
                <div className="flex items-center justify-between border-b border-white/10 bg-black/35 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    <RefreshCw className="h-4 w-4" />
                    {lastUpdatedLabel}
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[8px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        <span>Normal wait</span>
                        <Clock3 className="h-4 w-4" />
                      </div>
                      <p className="mt-5 font-mono text-sm text-amber-200">
                        * Agent is still thinking...
                      </p>
                    </div>

                    <div className="rounded-[8px] border border-emerald-400/30 bg-emerald-400/10 p-4">
                      <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                        <span>SpinShare wait</span>
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <p className="mt-5 min-h-10 font-mono text-sm text-sky-100">
                        {topBid?.adText ?? "Loading live bids for this wait line..."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[8px] border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Developer ledger preview
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {marketStatus === "ready"
                            ? `${formatMoney(hourlyEstimateCents)}/hr`
                            : "Loading live bids"}
                        </p>
                      </div>
                      <div className="rounded-[8px] bg-white px-3 py-2 text-sm font-black text-emerald-700">
                        {DEVELOPER_SHARE_PERCENT}% to developer
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-[8px] bg-white/10">
                      <div className="h-full w-[60%] rounded-[8px] bg-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="bid-market" className="bg-[#f8fbf9] px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                  Bid market
                </p>
                <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
                  The install button is backed by live advertiser demand.
                </h2>
                <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600">
                  Highest CPM wins the next eligible wait. Every lower funded bid stays visible underneath so developers can see the market depth before signup.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <div className="rounded-[8px] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Top CPM
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {marketStatus === "ready"
                      ? market?.summary.topCpmUsd ?? "$0.00"
                      : "Loading"}
                  </p>
                </div>
                <div className="rounded-[8px] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Updated
                  </p>
                  <p className="mt-1 text-xl font-black">{lastUpdatedLabel}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="grid min-w-[780px] grid-cols-[64px_minmax(280px,1fr)_160px_170px_110px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                <span>#</span>
                <span>Campaign line</span>
                <span>Bid</span>
                <span>Remaining budget</span>
                <span>Status</span>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[780px] divide-y divide-slate-100">
                  {visibleRows.length > 0 ? (
                    visibleRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[64px_minmax(280px,1fr)_160px_170px_110px] items-center px-4 py-4 text-sm font-semibold text-slate-700"
                      >
                        <span className="font-mono text-slate-400">{row.rank}</span>
                        <span className="truncate pr-5 font-bold text-slate-950">
                          {row.adText}
                        </span>
                        <span className="font-black text-slate-950">{row.bidLabel}</span>
                        <span>{row.remainingBudgetUsd}</span>
                        <span className="inline-flex w-fit items-center gap-2 rounded-[8px] bg-emerald-50 px-2 py-1 text-xs font-black uppercase text-emerald-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Live
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-12 text-center">
                      <p className="text-lg font-black text-slate-950">
                        {marketStatus === "loading"
                          ? "Loading live bids"
                          : marketStatus === "error"
                            ? "Bid market is temporarily unavailable"
                            : "No funded bids live yet"}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        Funded advertiser campaigns will appear here automatically.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-[8px] border border-emerald-700/20 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-emerald-950">Advertisers can move this market.</p>
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

        <section id="how-it-pays" className="border-y border-emerald-900/10 bg-[#111815] px-4 py-14 text-white sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[8px] border border-white/10 bg-white/5 p-5">
                <TrendingUp className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-4 text-xl font-black">1. Auction every wait</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                  The extension asks for the current winning campaign when your agent enters a wait state.
                </p>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-white/5 p-5">
                <Activity className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-4 text-xl font-black">2. Credit impressions</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                  Paid impressions credit your ledger without click bait or code upload requirements.
                </p>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-white/5 p-5">
                <ShieldCheck className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-4 text-xl font-black">3. Keep the split honest</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                  The developer share is fixed at 60%, with payout limits and fraud review protecting the exchange.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#edf7f0] px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Next paid wait
              </p>
              <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
                Put live advertiser money under your spinner.
              </h2>
            </div>
            <Link
              href={DEVELOPER_SIGNIN_HREF}
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-[8px] bg-emerald-600 px-5 text-base font-black text-white shadow-[0_18px_44px_rgba(22,163,74,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              <Code2 className="h-5 w-5" />
              Install the VS Code extension
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
