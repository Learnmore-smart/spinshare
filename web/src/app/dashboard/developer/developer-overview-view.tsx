"use client";

import {
  DEVELOPER_DAILY_EARNING_LIMIT_CENTS,
  DEVELOPER_HOURLY_EARNING_LIMIT_CENTS,
  MINIMUM_PAYOUT_CENTS,
  VELOCITY_THRESHOLD,
} from "@spinshare/core";

import { useT } from "@/lib/i18n/locale-provider";
import { formatDurationShort, msUntilUtcMidnight } from "@/lib/time/utc-periods";

import { useDeveloperDashboard } from "./developer-dashboard-data";
import { LimitMeter, money, pct } from "./developer-dashboard-parts";
import { SetupGuideButton } from "./setup-guide-modal";
import "./developer-dashboard.css";

export function DeveloperOverviewView() {
  const t = useT();
  const { summary } = useDeveloperDashboard();

  const {
    totalEarningsUsd,
    totalEarningsCents,
    todayEarningsUsd,
    monthEarningsUsd,
    hourlyEarningsCents,
    todayEarningsCents,
    impressionCount,
  } = summary;

  const payoutRemainingCents = Math.max(0, MINIMUM_PAYOUT_CENTS - totalEarningsCents);
  const payoutEligible = totalEarningsCents >= MINIMUM_PAYOUT_CENTS;
  const payoutProgress = pct(totalEarningsCents, MINIMUM_PAYOUT_CENTS);

  const hourlyReset = t.developerDashboard.hourlyResetLabel;
  const dailyReset = t.developerDashboard.dailyResetLabel(
    formatDurationShort(msUntilUtcMidnight()),
  );

  return (
    <>
      <section className="dev-dash-hero dev-dash-rise relative" data-testid="kpi-cards">
        <p className="relative text-xs font-black uppercase tracking-[0.18em] text-emerald-400/90">
          {t.developerDashboard.yourBalance}
        </p>
        <p className="dev-dash-balance relative mt-2" data-testid="kpi-total-earnings">
          ${totalEarningsUsd}
        </p>
        <p className="relative mt-2 text-sm font-semibold text-emerald-100/70">
          {t.developerDashboard.lifetimeCredit(impressionCount)}
        </p>

        <div className="relative mt-5">
          <div className="mb-1.5 flex justify-between text-[11px] font-bold text-emerald-200/80">
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
          <div className="h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300"
              style={{ width: `${payoutProgress}%` }}
            />
          </div>
        </div>

        {impressionCount === 0 && (
          <div className="relative mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold text-emerald-100/75">
              {t.developerDashboard.noImpressionsYet}
            </p>
            <SetupGuideButton className="mt-3 w-full sm:w-auto" />
          </div>
        )}
      </section>

      <section className="dev-dash-stat-scroll dev-dash-rise">
        <div className="dev-dash-stat" data-testid="kpi-today">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--dev-muted)]">{t.developerDashboard.todayUtc}</p>
          <p className="mt-1 text-xl font-black tabular-nums">${todayEarningsUsd}</p>
        </div>
        <div className="dev-dash-stat" data-testid="kpi-month">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--dev-muted)]">{t.developerDashboard.monthUtc}</p>
          <p className="mt-1 text-xl font-black tabular-nums">${monthEarningsUsd}</p>
        </div>
        <div className="dev-dash-stat">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--dev-muted)]">{t.developerDashboard.hourlyCap}</p>
          <p className="mt-1 text-xl font-black tabular-nums">{money(hourlyEarningsCents)}</p>
          <p className="mt-0.5 text-[10px] font-bold text-[var(--dev-muted)]">
            {t.developerDashboard.ofLimit(money(DEVELOPER_HOURLY_EARNING_LIMIT_CENTS))}
          </p>
        </div>
        <div className="dev-dash-stat" data-testid="kpi-impressions">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--dev-muted)]">{t.developerDashboard.events}</p>
          <p className="mt-1 text-xl font-black tabular-nums">{impressionCount}</p>
        </div>
      </section>

      <section className="dev-dash-panel dev-dash-rise grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <h2 className="dev-dash-section-title">{t.developerDashboard.earningCaps}</h2>
          <p className="dev-dash-section-body">
            {t.developerDashboard.earningCapsBody(VELOCITY_THRESHOLD)}
          </p>
          <div className="mt-4 space-y-4">
            <LimitMeter
              label={t.developerDashboard.hourlyRolling}
              usedCents={hourlyEarningsCents}
              limitCents={DEVELOPER_HOURLY_EARNING_LIMIT_CENTS}
              reset={hourlyReset}
            />
            <LimitMeter
              label={t.developerDashboard.dailyUtc}
              usedCents={todayEarningsCents}
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
          <button
            type="button"
            disabled={!payoutEligible}
            className="spinshare-btn-primary mt-4 min-h-11 w-full justify-center rounded-full text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.developerDashboard.connectPayouts}
          </button>
          <p className="dev-dash-section-caption">
            {payoutEligible
              ? t.developerDashboard.payoutAboveMinimum
              : t.developerDashboard.payoutBelowMinimum(money(payoutRemainingCents))}
          </p>
        </div>
      </section>
    </>
  );
}
