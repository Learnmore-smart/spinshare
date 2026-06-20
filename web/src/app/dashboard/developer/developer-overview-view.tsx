"use client";

import { useEffect, useState } from "react";
import { Clock3, X } from "lucide-react";
import {
  DEVELOPER_DAILY_EARNING_LIMIT_CENTS,
  DEVELOPER_HOURLY_EARNING_LIMIT_CENTS,
  MICROCENTS_PER_CENT,
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
import { LimitMeter, money, moneyMicrocents3, pct } from "./developer-dashboard-parts";
import { PayoutPanel } from "./payout-panel";
import { SetupGuideButton } from "./setup-guide-modal";
import "./developer-dashboard.css";

const SIGNUP_BONUS_DISMISS_KEY = "spinshare:signup-bonus-alert-dismissed";

export function DeveloperOverviewView() {
  const t = useT();
  const { summary } = useDeveloperDashboard();
  const [now, setNow] = useState(() => Date.now());
  const [signupBonusDismissed, setSignupBonusDismissed] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!summary.hasSignupBonus) {
      setSignupBonusDismissed(true);
      return;
    }
    setSignupBonusDismissed(
      window.sessionStorage.getItem(SIGNUP_BONUS_DISMISS_KEY) === "1",
    );
  }, [summary.hasSignupBonus]);

  const {
    totalEarningsUsd,
    totalEarningsCents,
    totalEarningsDisplayMicrocents,
    todayEarningsUsd,
    monthEarningsUsd,
    hourlyEarningsCents,
    hourlyEarningsUsd,
    todayEarningsCents,
    impressionCount,
    hasSignupBonus,
    rows,
  } = summary;

  const payoutEligible = totalEarningsCents >= MINIMUM_PAYOUT_CENTS;
  const payoutProgress = pct(totalEarningsCents, MINIMUM_PAYOUT_CENTS);
  // Eligibility/progress stay on whole-cent accounting, but the threshold copy
  // mirrors the sub-cent balance KPI: derive remaining/target from display
  // micro-cents so a $0.075 balance reads "还差 $9.925，目标 $10.000".
  const minimumPayoutMicrocents = MINIMUM_PAYOUT_CENTS * MICROCENTS_PER_CENT;
  const payoutRemainingMicrocents = Math.max(
    0,
    minimumPayoutMicrocents - totalEarningsDisplayMicrocents,
  );

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
      {hasSignupBonus && !signupBonusDismissed ? (
        <div
          className="dev-dash-notice dev-dash-rise dev-dash-signup-bonus"
          role="status"
          data-testid="signup-bonus-alert"
        >
          <p className="dev-dash-notice-body">{t.developerDashboard.signupBonusCredited}</p>
          <button
            type="button"
            className="dev-dash-signup-bonus-dismiss"
            aria-label="Dismiss"
            onClick={() => {
              window.sessionStorage.setItem(SIGNUP_BONUS_DISMISS_KEY, "1");
              setSignupBonusDismissed(true);
            }}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

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
                ? t.developerDashboard.payoutReached(
                    moneyMicrocents3(minimumPayoutMicrocents),
                  )
                : t.developerDashboard.payoutRemaining(
                    moneyMicrocents3(payoutRemainingMicrocents),
                    moneyMicrocents3(minimumPayoutMicrocents),
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

      <div
        className="dev-dash-notice dev-dash-rise"
        role="status"
        data-testid="payout-timing-notice"
      >
        <span className="dev-dash-notice-icon" aria-hidden>
          <Clock3 className="h-4 w-4" />
        </span>
        <p className="dev-dash-notice-body">{t.developerDashboard.payoutTimingNotice}</p>
      </div>

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
          <p className="dev-dash-section-caption mt-2">
            {t.developerDashboard.trafficAuditNotice}
          </p>
          <PayoutPanel />
        </div>
      </TiltCard>
    </>
  );
}
