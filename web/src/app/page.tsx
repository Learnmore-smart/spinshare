"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Github, Terminal, MonitorPlay, BarChart3 } from "lucide-react";

import { TiltCard } from "@/components/TiltCard";
import { SpinShareWordmark } from "@/components/SpinShareWordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import LoadingStatus, {
  ELLIPSIS_STEP_MS,
  ICON_FRAME_MS,
  LOADING_ICONS,
  LOADING_VERBS,
} from "@/components/LoadingStatus";

const ARCHIVE_BANNER_TEXT =
  "SpinShare is an archived experiment testing AI workflow sponsor slots. It is not currently operating as a live ad marketplace.";

const REPO_URL = "https://github.com/Learnmore-smart/spinshare";

const DEMO_AD_COPY = "LearnX · master AI engineering";
const DEMO_AD_BRAND = "LearnX";

const POSTMORTEM_STATS = [
  { value: "52K", label: "views on X.com", sub: "Launch went viral. The premise got attention." },
  { value: "4", label: "signups", sub: "A handful of users created accounts." },
  { value: "0", label: "usage", sub: "No one actually ran the sponsored-spinner flow." },
];

const CLAUDE_CATEGORIES = ["Bash", "Glob", "Write", "Read"] as const;
const CLAUDE_STATES = LOADING_VERBS.map((verb, i) => ({
  action: verb,
  category: CLAUDE_CATEGORIES[i % CLAUDE_CATEGORIES.length],
  duration: Math.max(3.0, 1.0 + ((i * 7 + 3) % 25) / 10),
}));

const EXPERIMENT_STEPS = [
  {
    icon: Terminal,
    title: "CLI interceptor",
    body: "A wrapper around AI CLIs (Claude Code) that intercepted the loading spinner and injected sponsored text into the wait state.",
  },
  {
    icon: MonitorPlay,
    title: "VSCode extension",
    body: "An extension that overlaid sponsored text on the AI's loading state inside the IDE, with a terminal auto-wrap mode.",
  },
  {
    icon: BarChart3,
    title: "Web marketplace",
    body: "A live marketplace matched advertisers to developers. The highest CPM bid won placement. Stripe handled checkout and payouts.",
  },
];

export default function HomePage() {
  const [claudeStateIndex, setClaudeStateIndex] = useState(0);
  const [leftTimer, setLeftTimer] = useState(0);
  const [rightTimer, setRightTimer] = useState(0);

  const currentClaudeState = CLAUDE_STATES[claudeStateIndex] ?? CLAUDE_STATES[0]!;

  const leftElapsedMs = Math.round(leftTimer * 1000);
  const leftIconIndex = Math.floor(leftElapsedMs / ICON_FRAME_MS) % LOADING_ICONS.length;
  const leftIcon = LOADING_ICONS[leftIconIndex] ?? "·";

  const rightElapsedMs = Math.round(rightTimer * 1000);
  const sharedDotCount = Math.floor(rightElapsedMs / ELLIPSIS_STEP_MS) % 4;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLeftTimer((prev) => {
        const nextVal = prev + 0.1;
        if (nextVal >= currentClaudeState.duration) {
          setClaudeStateIndex((prevIdx) => (prevIdx + 1) % CLAUDE_STATES.length);
          return 0;
        }
        return nextVal;
      });
      setRightTimer((prev) => {
        const nextVal = prev + 0.1;
        return nextVal > 10.0 ? 0.0 : nextVal;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [claudeStateIndex, currentClaudeState.duration]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        {/* Archive banner — replaces the old live-bid ticker */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-[11px] font-bold tracking-wide text-amber-900 sm:text-xs">
          {ARCHIVE_BANNER_TEXT}
        </div>

        {/* Navbar */}
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

          <nav className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-10 text-sm font-bold lg:pointer-events-auto lg:flex xl:gap-16">
            <a href="#demo">Demo</a>
            <a href="#experiment">Experiment</a>
            <a href="#video">Launch reel</a>
            <a href="#postmortem">Postmortem</a>
          </nav>

          <div className="flex items-center gap-1.5">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="spinshare-btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[var(--text-accent-strong)]"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">Source</span>
            </a>
          </div>
        </div>
      </header>

      <div className="spinshare-home min-h-screen">
        <main className="spinshare-home-frame" style={{ paddingTop: "7rem" }}>
          {/* Hero */}
          <section id="hero" className="spinshare-home-hero">
            <div className="spinshare-blob-1 pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full blur-3xl animate-pulse-slow" />
            <div className="spinshare-blob-2 pointer-events-none absolute -right-40 -bottom-40 h-96 w-96 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "-5s" }} />
            <div className="spinshare-hero-layout">
              <div className="spinshare-hero-copy">
                <p className="spinshare-home-label-accent text-xs font-black uppercase tracking-[0.18em]">
                  Archived experiment · 2026
                </p>
                <h1 className="mt-3 max-w-3xl text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
                  <span className="block">SpinShare</span>
                  <span className="mt-2 block spinshare-hero-highlight-3d">
                    AI workflow sponsor slots
                  </span>
                </h1>
                <div className="spinshare-home-body mt-6 max-w-xl text-lg font-semibold leading-8">
                  <p>
                    Could the loading spinner inside AI coding tools become a new ad surface?
                    SpinShare tested that hypothesis with a CLI interceptor, a VSCode extension,
                    and a live ad marketplace. The experiment ran in 2026 and is now archived.
                  </p>
                </div>
              </div>

              <div className="spinshare-hero-primary-cta mt-6 flex flex-col items-center justify-center gap-3 lg:items-start lg:justify-start">
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="spinshare-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm text-white"
                >
                  <Github className="h-4 w-4" />
                  View source on GitHub
                </a>
                <a
                  href="#postmortem"
                  className="spinshare-btn-outline inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-[var(--text-accent-strong)]"
                >
                  Read the postmortem
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </section>

          {/* Frozen sponsor-slot demo */}
          <section id="demo" className="spinshare-frame-section spinshare-home-section-muted px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-3xl text-center">
                <p className="spinshare-home-label-accent text-xs font-black uppercase tracking-[0.18em]">
                  Frozen demo · no live data
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                  What the sponsor slot looked like
                </h2>
                <p className="spinshare-home-body mt-4 text-base font-semibold leading-7">
                  A side-by-side of the AI CLI loading state, with and without the sponsored overlay.
                  This is a static render — no live bids, no real ad serving.
                </p>
              </div>

              <div className="spinshare-process-panel spinshare-hero-proof-rail mt-11 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
                <div className="min-w-0">
                  <p className="spinshare-home-label mb-3 text-xs font-black uppercase tracking-[0.16em]">
                    Stock AI spinner
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
                      <span className="text-zinc-500 text-xs font-semibold shrink-0 pl-2">
                        {currentClaudeState.category} · {leftTimer.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mx-auto flex flex-col items-center justify-center rotate-90 lg:rotate-0 select-none">
                  <div className="hidden lg:block h-7" />
                  <span className="text-emerald-500 font-black text-5xl tracking-tighter shrink-0 leading-none">»</span>
                </div>

                <div className="min-w-0">
                  <p className="spinshare-home-label-accent mb-3 text-xs font-black uppercase tracking-[0.16em]">
                    With SpinShare overlay
                  </p>
                  <div className="liquid-glass-black border border-emerald-900/35 p-5 text-left">
                    <div className="flex items-center justify-between font-mono text-sm">
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
                          {DEMO_AD_COPY}
                          <span className="inline-block w-[3ch] text-left">{".".repeat(sharedDotCount)}</span>
                        </span>
                      </div>
                      <span className="text-zinc-500 text-xs font-semibold shrink-0 pl-2">
                        {currentClaudeState.category} · {leftTimer.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="spinshare-home-body mx-auto mt-6 max-w-2xl text-center text-xs font-semibold">
                The sponsored overlay rendered inside the AI&apos;s loading state. Ads were only counted
                as impressions after 3 seconds of viewability.
              </p>
            </div>
          </section>

          {/* Experiment explanation */}
          <section id="experiment" className="spinshare-frame-section spinshare-home-section-muted px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-3xl text-center">
                <p className="spinshare-home-label-accent text-xs font-black uppercase tracking-[0.18em]">
                  How it worked
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl text-[var(--text-primary)]">
                  Three pieces, one experiment
                </h2>
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {EXPERIMENT_STEPS.map((step) => {
                  const Icon = step.icon;
                  return (
                    <TiltCard
                      key={step.title}
                      className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-white)] p-6 flex items-start gap-4"
                      intensity={10}
                      scale={1.02}
                      glow="16, 185, 129"
                      glareRadius={250}
                      restShadow="0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.02)"
                      hoverShadow="0 30px 60px -15px rgba(16, 185, 129, 0.18), 0 15px 30px -10px rgba(0, 0, 0, 0.1)"
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/30">
                        <Icon className="h-8 w-8" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-base font-black text-[var(--text-primary)] leading-tight">
                          {step.title}
                        </h3>
                        <p className="text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                          {step.body}
                        </p>
                      </div>
                    </TiltCard>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Launch video */}
          <section id="video" className="spinshare-frame-section spinshare-home-section-muted px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-5xl">
              <div className="mx-auto max-w-3xl text-center">
                <p className="spinshare-home-label-accent text-xs font-black uppercase tracking-[0.18em]">
                  Historical artifact
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl text-[var(--text-primary)]">
                  Launch reel
                </h2>
                <p className="spinshare-home-body mt-4 text-base font-semibold leading-7">
                  The original launch animation. Historical context only — SpinShare is no longer
                  operating as a live marketplace.
                </p>
              </div>

              <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[#07090a] shadow-2xl">
                <iframe
                  src="/launch-video.html"
                  title="SpinShare launch reel"
                  className="block aspect-video w-full"
                  loading="lazy"
                  style={{ border: "0", minHeight: "360px" }}
                />
              </div>
            </div>
          </section>

          {/* Postmortem / metrics */}
          <section id="postmortem" className="spinshare-frame-section spinshare-home-section-muted px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-3xl text-center">
                <p className="spinshare-home-label-accent text-xs font-black uppercase tracking-[0.18em]">
                  Postmortem
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                  What actually happened
                </h2>
              </div>

              <div className="mt-10 grid gap-3 sm:gap-4 sm:grid-cols-3">
                {POSTMORTEM_STATS.map((stat) => (
                  <div key={stat.label} className="liquid-glass flex flex-col gap-1 rounded-2xl px-5 py-4">
                    <p className="spinshare-home-strong flex items-center gap-2 text-5xl font-black tabular-nums leading-none tilt-pop-sm">
                      {stat.value}
                    </p>
                    <p className="spinshare-home-label text-[10px] font-black uppercase tracking-[0.16em]">
                      {stat.label}
                    </p>
                    <p className="spinshare-home-body text-xs font-semibold">{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="liquid-glass mx-auto mt-10 max-w-3xl rounded-2xl p-6">
                <p className="spinshare-home-body text-sm font-semibold leading-7">
                  The launch went viral on X.com, reaching 52K views. Four users signed up.
                  Zero actually ran the sponsored-spinner flow. The experiment showed that viral
                  attention doesn&apos;t translate to adoption when onboarding friction is high and
                  the value proposition requires integration partners we didn&apos;t have. The
                  marketplace never reached the chicken-and-egg escape velocity it needed.
                </p>
                <p className="spinshare-home-body mt-4 text-xs font-semibold">
                  Full write-up with lessons learned:{" "}
                  <a
                    href={REPO_URL + "/blob/archive/public/POSTMORTEM.md"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--text-accent-strong)] underline underline-offset-2"
                  >
                    POSTMORTEM.md
                  </a>
                </p>
              </div>
            </div>
          </section>
        </main>

        <footer className="spinshare-home-footer px-4 py-8 sm:px-6">
          <div className="liquid-glass spinshare-static mx-auto flex max-w-7xl flex-col gap-5 rounded-[20px] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo/spinshare-logo.png"
                  alt="SpinShare Logo"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-[8px] object-contain"
                />
                <SpinShareWordmark />
              </div>
              <p className="min-w-0 text-sm leading-relaxed">
                &copy; 2026 SpinShare. An archived experiment. Not a live service.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <LanguageSwitcher />
            </div>
          </div>
        </footer>
      </div>

      <LoadingStatus className="sr-only" />
    </>
  );
}
