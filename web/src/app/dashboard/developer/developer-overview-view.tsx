"use client";

import { useEffect, useState } from "react";
import {
  DEVELOPER_DAILY_EARNING_LIMIT_CENTS,
  DEVELOPER_HOURLY_EARNING_LIMIT_CENTS,
  MINIMUM_PAYOUT_CENTS,
} from "@spinshare/core";

import { TiltCard } from "@/components/TiltCard";
import { useT } from "@/lib/i18n/locale-provider";
import {
  formatDurationShort,
  msUntilNextUtcHour,
  msUntilOldestRollingHourCreditExpires,
  msUntilUtcMidnight,
} from "@/lib/time/utc-periods";

import { useDeveloperDashboard } from "./developer-dashboard-data";
import { LimitMeter, money, pct } from "./developer-dashboard-parts";
import { PayoutPanel } from "./payout-panel";
import { SetupGuideButton } from "./setup-guide-modal";
import "./developer-dashboard.css";

export function DeveloperOverviewView() {
  const t = useT();
  const { summary } = useDeveloperDashboard();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const {
    totalEarningsUsd,
    totalEarningsCents,
    todayEarningsUsd,
    monthEarningsUsd,
    hourlyEarningsCents,
    hourlyEarningsUsd,
    todayEarningsCents,
    impressionCount,
    rows,
  } = summary;

  const payoutRemainingCents = Math.max(0, MINIMUM_PAYOUT_CENTS - totalEarningsCents);
  const payoutEligible = totalEarningsCents >= MINIMUM_PAYOUT_CENTS;
  const payoutProgress = pct(totalEarningsCents, MINIMUM_PAYOUT_CENTS);

  const creditTimestampsMs = rows.flatMap((row) =>
    row.createdAtMs === undefined ? [] : [row.createdAtMs],
  );
  const msUntilHourlyRollOff = msUntilOldestRollingHourCreditExpires(
    creditTimestampsMs,
    now,
  );
  const hourlyReset = t.developerDashboard.hourlyResetLabel(
    formatDurationShort(msUntilHourlyRollOff ?? msUntilNextUtcHour(now)),
  );
  const dailyReset = t.developerDashboard.dailyResetLabel(
    formatDurationShort(msUntilUtcMidnight(now)),
  );

  return (
    <>
      <TiltCard
        className="dev-dash-hero dev-dash-rise relative"
        data-testid="kpi-cards"
        intensity={8}
        scale={1.01}
        glareRadius={520}
      >
        <p className="relative text-xs font-black uppercase tracking-[0.18em] dev-dash-hero-eyebrow">
          {t.developerDashboard.yourBalance}
        </p>
        <p className="dev-dash-balance relative mt-2" data-testid="kpi-total-earnings">
          ${totalEarningsUsd}
        </p>
        <p className="relative mt-2 text-sm font-semibold dev-dash-hero-sub">
          {t.developerDashboard.lifetimeCredit(impressionCount)}
        </p>

        <div className="relative mt-5">
          <div className="mb-1.5 flex justify-between text-[11px] font-bold dev-dash-hero-threshold">
            <span>{t.developerDashboard.payoutThreshold}</span>
            <span>
              {payoutEligible
                ? t.developerDashboard.payoutReached(money(MINIMUM_PAYOUT_CENTS))
                : t.developerDashboard.payoutRemaining(
                    money(payoutRemainingCents),
                    money(MINIMUM_PAYOUT_CENTS),
                  )}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full dev-dash-hero-progress-track">
            <div
              className="h-full rounded-full dev-dash-hero-progress-fill"
              style={{ width: `${payoutProgress}%` }}
            />
          </div>
        </div>

        {impressionCount === 0 && (
          <div className="relative mt-5 border-t dev-dash-hero-divider pt-4">
            <p className="text-xs font-semibold dev-dash-hero-sub">
              {t.developerDashboard.noImpressionsYet}
            </p>
            <SetupGuideButton className="mt-3 w-full sm:w-auto" />
          </div>
        )}
      </TiltCard>

      <section className="dev-dash-stat-scroll dev-dash-rise">
        <TiltCard className="dev-dash-stat" data-testid="kpi-today" intensity={15} scale={1.04} glareRadius={180}>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--dev-muted)]">{t.developerDashboard.todayUtc}</p>
          <p className="tilt-pop-sm mt-1 text-xl font-black tabular-nums">${todayEarningsUsd}</p>
        </TiltCard>
        <TiltCard className="dev-dash-stat" data-testid="kpi-month" intensity={15} scale={1.04} glareRadius={180}>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--dev-muted)]">{t.developerDashboard.monthUtc}</p>
          <p className="tilt-pop-sm mt-1 text-xl font-black tabular-nums">${monthEarningsUsd}</p>
        </TiltCard>
        <TiltCard className="dev-dash-stat" data-testid="kpi-impressions" intensity={15} scale={1.04} glareRadius={180}>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--dev-muted)]">{t.developerDashboard.events}</p>
          <p className="tilt-pop-sm mt-1 text-xl font-black tabular-nums">{impressionCount}</p>
        </TiltCard>
      </section>

      <TiltCard className="dev-dash-panel dev-dash-rise grid gap-5 p-4 sm:grid-cols-2 sm:p-5" intensity={6} scale={1.008}>
        <div>
          <h2 className="dev-dash-section-title">{t.developerDashboard.earningCaps}</h2>
          <div className="mt-4 space-y-4">
            <LimitMeter
              label={t.developerDashboard.hourlyRolling}
              usedCents={hourlyEarningsCents}
              usedLabel={`$${hourlyEarningsUsd}`}
              limitCents={DEVELOPER_HOURLY_EARNING_LIMIT_CENTS}
              reset={hourlyReset}
            />
            <LimitMeter
              label={t.developerDashboard.dailyUtc}
              usedCents={todayEarningsCents}
              usedLabel={`$${todayEarningsUsd}`}
              limitCents={DEVELOPER_DAILY_EARNING_LIMIT_CENTS}
              reset={dailyReset}
            />
          </div>
        </div>

        <div className="dev-dash-callout">
          <h2 className="dev-dash-section-title">{t.developerDashboard.getPaid}</h2>
          <p className="dev-dash-section-body">
            {t.developerDashboard.getPaidBody(money(MINIMUM_PAYOUT_CENTS))}
          </p>
          <PayoutPanel />
        </div>
      </TiltCard>
    </>
  );
}
