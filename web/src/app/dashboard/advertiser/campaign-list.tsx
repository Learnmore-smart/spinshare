"use client";

/**
 * Campaign list + buy-more-impressions controls (task 12.4).
 *
 * Renders each of the advertiser's campaigns with its remaining budget and max
 * CPM (R9.5), and provides a per-campaign purchase control that validates
 * the requested amount against the shared $1.00–$100,000.00 bounds (R9.6, R9.7)
 * before `POST`ing to `/api/funds/checkout` and redirecting the browser to the
 * returned Stripe checkout URL.
 *
 * When the advertiser has no campaigns yet an empty state is shown instead.
 */

import { useState } from "react";
import {
  BarChart3,
  CreditCard,
  Layers,
  Coins,
  TrendingUp,
  Eye,
  CheckCircle2,
  MousePointerClick,
  Percent,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-provider";
import { translateValidationError } from "@/lib/i18n/translate-validation-error";

import {
  campaignTelemetry,
  formatCount,
  formatCtr,
  formatUsd,
  nonCreditTotal,
  validateFundingBlocks,
  type CampaignView,
} from "./lib";

/** Props for {@link CampaignList}. */
export interface CampaignListProps {
  /** Bearer `Device_Auth_Token` for the authenticated advertiser. */
  token: string;
  /** Campaigns owned by the advertiser, already enriched with USD strings. */
  campaigns: CampaignView[];
}

export function CampaignList({ token, campaigns }: CampaignListProps) {
  const t = useT();
  if (campaigns.length === 0) {
    return (
      <div className="adv-dash-empty" data-testid="campaigns-empty">
        <div className="adv-dash-empty-icon">
          <Layers className="h-5 w-5" aria-hidden />
        </div>
        <p className="adv-dash-empty-title">{t.advertiserDashboard.noCampaignsTitle}</p>
        <p className="adv-dash-empty-body">{t.advertiserDashboard.noCampaignsDesc}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="campaigns-list">
      {campaigns.map((campaign) => (
        <li key={campaign.id}>
          <CampaignCard token={token} campaign={campaign} />
        </li>
      ))}
    </ul>
  );
}

function statusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "active" || normalized === "bidding") {
    return "adv-dash-status adv-dash-status--active";
  }
  return "adv-dash-status adv-dash-status--paused";
}

function deliverySummary({
  budgetCents,
  cpmCents,
  served,
}: {
  budgetCents: number;
  cpmCents: number;
  served: number;
}): { target: number; percent: number } {
  const remainingImpressions =
    cpmCents > 0 ? Math.floor((budgetCents * 1000) / cpmCents) : 0;
  const target = served + remainingImpressions;
  return {
    target,
    percent: target > 0 ? Math.min(100, (served / target) * 100) : 0,
  };
}

/** A single campaign row with its stats and purchase control. */
function CampaignCard({
  token,
  campaign,
}: {
  token: string;
  campaign: CampaignView;
}) {
  const t = useT();
  const [blocks, setBlocks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const telemetry = campaignTelemetry(campaign);
  const uncredited = nonCreditTotal(telemetry);
  const antiAbuse = telemetry.shadowBanned + telemetry.earningCapped;
  const delivery = deliverySummary({
    budgetCents: campaign.budgetCents,
    cpmCents: campaign.cpmCents,
    served: telemetry.credited,
  });

  async function buyMoreImpressions(): Promise<void> {
    setError(null);

    const result = validateFundingBlocks(blocks);
    if (!result.ok) {
      setError(translateValidationError(result.error, t));
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/funds/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          blockCount: result.blocks,
        }),
      });

      if (response.ok) {
        const body = (await response.json()) as { url: string };
        window.location.href = body.url;
        return;
      }
      if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? t.advertiserDashboard.amountRejected);
      } else if (response.status === 401) {
        setError(t.advertiserDashboard.sessionExpired);
      } else {
        setError(t.advertiserDashboard.checkoutError(response.status));
      }
    } catch {
      setError(t.advertiserDashboard.networkError);
    } finally {
      setBusy(false);
    }
  }

  const isStatusActive = campaign.status.toLowerCase() === "active" || campaign.status.toLowerCase() === "bidding";
  const neverFunded = campaign.budgetCents === 0 && telemetry.shows === 0 && telemetry.credited === 0;

  return (
    <article className="adv-dash-campaign-card">
      <div className="adv-dash-campaign-main">
        <div className="adv-dash-campaign-head">
          <div className="min-w-0">
            <p className="adv-dash-campaign-text">{campaign.adText}</p>
            <div className="adv-dash-campaign-meta">
              <span className="adv-campaign-chip" title={t.advertiserDashboard.maxCpm}>
                <TrendingUp className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                <span>{t.advertiserDashboard.maxCpm}</span>
                <strong>{formatUsd(campaign.cpmCents)}</strong>
              </span>
            </div>
          </div>
          <span className={statusClass(campaign.status)}>
            <span className={`adv-status-dot ${isStatusActive ? "adv-status-dot--active" : "adv-status-dot--paused"}`} />
            {campaign.status}
          </span>
        </div>

        {!neverFunded && (
          <>
            <div className="adv-dash-campaign-delivery">
              <div className="adv-dash-campaign-delivery-head">
                <span className="adv-dash-campaign-delivery-label">
                  <BarChart3 className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                  {t.advertiserDashboard.totalServed}
                </span>
                <strong className="adv-dash-campaign-delivery-value">
                  {formatCount(telemetry.credited)}/{formatCount(delivery.target)}
                </strong>
              </div>
              <div
                className="adv-dash-campaign-progress-track"
                role="progressbar"
                aria-label="Campaign delivery progress"
                aria-valuemin={0}
                aria-valuemax={delivery.target}
                aria-valuenow={telemetry.credited}
              >
                <div
                  className="adv-dash-campaign-progress-fill"
                  style={{ width: `${delivery.percent.toFixed(2)}%` }}
                />
              </div>
            </div>

            <div className="adv-dash-campaign-telemetry" aria-label="Campaign telemetry">
              <div className="adv-telemetry-card">
                <span className="adv-telemetry-card-header">
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  {t.advertiserDashboard.shows}
                </span>
                <strong className="adv-telemetry-card-value">{formatCount(telemetry.shows)}</strong>
              </div>
              <div className="adv-telemetry-card">
                <span className="adv-telemetry-card-header">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  {t.advertiserDashboard.totalServed}
                </span>
                <strong className="adv-telemetry-card-value">{formatCount(telemetry.credited)}</strong>
              </div>
              <div className="adv-telemetry-card">
                <span className="adv-telemetry-card-header">
                  <MousePointerClick className="h-3.5 w-3.5" aria-hidden />
                  {t.advertiserDashboard.clicks}
                </span>
                <strong className="adv-telemetry-card-value">{formatCount(telemetry.clicks)}</strong>
              </div>
              <div className="adv-telemetry-card">
                <span className="adv-telemetry-card-header">
                  <Percent className="h-3.5 w-3.5" aria-hidden />
                  {t.advertiserDashboard.ctr}
                </span>
                <strong className="adv-telemetry-card-value">{formatCtr(telemetry.clicks, telemetry.shows)}</strong>
              </div>
            </div>

            <div className="adv-dash-campaign-diagnostics" aria-label="Campaign diagnostics">
              <div className={`adv-diag-tag ${uncredited > 0 ? "adv-diag-tag--warning" : "adv-diag-tag--zero"}`}>
                <Info className="h-3 w-3" aria-hidden />
                <span>{t.advertiserDashboard.uncredited}</span>
                <strong>{formatCount(uncredited)}</strong>
              </div>
              <div className={`adv-diag-tag ${telemetry.tooShort > 0 ? "adv-diag-tag--warning" : "adv-diag-tag--zero"}`}>
                <Info className="h-3 w-3" aria-hidden />
                <span>{t.advertiserDashboard.tooShort}</span>
                <strong>{formatCount(telemetry.tooShort)}</strong>
              </div>
              <div className={`adv-diag-tag ${telemetry.invalidToken > 0 ? "adv-diag-tag--warning" : "adv-diag-tag--zero"}`}>
                <Info className="h-3 w-3" aria-hidden />
                <span>{t.advertiserDashboard.authIssues}</span>
                <strong>{formatCount(telemetry.invalidToken)}</strong>
              </div>
              <div className={`adv-diag-tag ${telemetry.invalidCampaign > 0 ? "adv-diag-tag--warning" : "adv-diag-tag--zero"}`}>
                <Info className="h-3 w-3" aria-hidden />
                <span>{t.advertiserDashboard.outOfBudget}</span>
                <strong>{formatCount(telemetry.invalidCampaign)}</strong>
              </div>
              <div className={`adv-diag-tag ${antiAbuse > 0 ? "adv-diag-tag--warning" : "adv-diag-tag--zero"}`}>
                <Info className="h-3 w-3" aria-hidden />
                <span>{t.advertiserDashboard.antiAbuse}</span>
                <strong>{formatCount(antiAbuse)}</strong>
              </div>
              <div className={`adv-diag-tag ${telemetry.duplicate > 0 ? "adv-diag-tag--warning" : "adv-diag-tag--zero"}`}>
                <Info className="h-3 w-3" aria-hidden />
                <span>{t.advertiserDashboard.duplicate}</span>
                <strong>{formatCount(telemetry.duplicate)}</strong>
              </div>
            </div>
          </>
        )}

        {neverFunded && (
          <div className="adv-dash-campaign-unfunded">
            <div className="adv-dash-campaign-unfunded-icon">
              <CreditCard className="h-5 w-5" aria-hidden />
            </div>
            <p className="adv-dash-campaign-unfunded-title">{t.advertiserDashboard.neverFundedTitle}</p>
            <p className="adv-dash-campaign-unfunded-body">{t.advertiserDashboard.neverFundedDesc}</p>
          </div>
        )}
      </div>

      <div className="adv-dash-campaign-funds">
        <label
          htmlFor={`funds-${campaign.id}`}
          className="adv-dash-campaign-buy-label"
        >
          <CreditCard className="h-4 w-4" aria-hidden />
          {t.advertiserDashboard.addFundsLabel}
        </label>
        <div className="adv-dash-campaign-buy-control">
          <input
            id={`funds-${campaign.id}`}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={blocks}
            onChange={(event) => setBlocks(event.target.value)}
            placeholder={t.advertiserDashboard.addFundsPlaceholder}
            className="spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal border border-input focus:ring-2 focus:ring-ring focus:border-transparent outline-none rounded-md"
          />
          <Button
            type="button"
            variant="default"
            disabled={busy}
            className="adv-dash-campaign-buy-button font-bold text-white"
            onClick={() => {
              void buyMoreImpressions();
            }}
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            {busy ? t.advertiserDashboard.redirecting : t.advertiserDashboard.addFunds}
          </Button>
        </div>
        <p className="adv-dash-campaign-buy-hint">
          {t.advertiserDashboard.addFundsHint}
        </p>
        {error !== null && (
          <p className="mt-2 text-sm font-semibold text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
