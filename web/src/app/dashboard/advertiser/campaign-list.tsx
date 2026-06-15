"use client";

/**
 * Campaign list + "Add Funds" controls (task 12.4).
 *
 * Renders each of the advertiser's campaigns with its remaining budget and max
 * CPM (R9.5), and provides a per-campaign "Add Funds" control that validates
 * the requested amount against the shared $1.00–$100,000.00 bounds (R9.6, R9.7)
 * before `POST`ing to `/api/funds/checkout` and redirecting the browser to the
 * returned Stripe checkout URL.
 *
 * When the advertiser has no campaigns yet an empty state is shown instead.
 */

import { useState } from "react";
import { Layers, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-provider";
import { translateValidationError } from "@/lib/i18n/translate-validation-error";

import {
  campaignTelemetry,
  formatCount,
  formatCtr,
  formatUsd,
  nonCreditTotal,
  validateFundingDollars,
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

/** A single campaign row with its stats and the "Add Funds" control. */
function CampaignCard({
  token,
  campaign,
}: {
  token: string;
  campaign: CampaignView;
}) {
  const t = useT();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const telemetry = campaignTelemetry(campaign);
  const uncredited = nonCreditTotal(telemetry);
  const antiAbuse = telemetry.shadowBanned + telemetry.earningCapped;

  async function addFunds(): Promise<void> {
    setError(null);

    const result = validateFundingDollars(amount);
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
          amountCents: result.cents,
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

  return (
    <article className="adv-dash-campaign-card">
      <div className="adv-dash-campaign-head">
        <p className="adv-dash-campaign-text">{campaign.adText}</p>
        <div className="adv-dash-campaign-meta">
          <span>
            {t.advertiserDashboard.remainingBudget}{" "}
            <strong>{formatUsd(campaign.budgetCents)}</strong>
          </span>
          <span>
            {t.advertiserDashboard.maxCpm}{" "}
            <strong>{formatUsd(campaign.cpmCents)}</strong>
          </span>
          <span className={statusClass(campaign.status)}>{campaign.status}</span>
        </div>
      </div>

      <div className="adv-dash-campaign-telemetry" aria-label="Campaign telemetry">
        <div>
          <span>Shows</span>
          <strong>{formatCount(telemetry.shows)}</strong>
        </div>
        <div>
          <span>Served</span>
          <strong>{formatCount(telemetry.credited)}</strong>
        </div>
        <div>
          <span>Clicks</span>
          <strong>{formatCount(telemetry.clicks)}</strong>
        </div>
        <div>
          <span>CTR</span>
          <strong>{formatCtr(telemetry.clicks, telemetry.shows)}</strong>
        </div>
      </div>

      <div className="adv-dash-campaign-diagnostics" aria-label="Campaign diagnostics">
        <span>
          Not credited <strong>{formatCount(uncredited)}</strong>
        </span>
        <span>
          Too short <strong>{formatCount(telemetry.tooShort)}</strong>
        </span>
        <span>
          Auth issues <strong>{formatCount(telemetry.invalidToken)}</strong>
        </span>
        <span>
          Out of budget <strong>{formatCount(telemetry.invalidCampaign)}</strong>
        </span>
        <span>
          Anti-abuse <strong>{formatCount(antiAbuse)}</strong>
        </span>
        <span>
          Duplicate <strong>{formatCount(telemetry.duplicate)}</strong>
        </span>
      </div>

      <div className="adv-dash-campaign-funds">
        <label
          htmlFor={`funds-${campaign.id}`}
          className="flex items-center gap-2 text-sm font-bold text-foreground"
        >
          <Wallet className="h-4 w-4 text-amber-600" aria-hidden />
          {t.advertiserDashboard.addFundsLabel}
        </label>
        <div className="mt-2 flex flex-wrap items-start gap-2">
          <input
            id={`funds-${campaign.id}`}
            type="number"
            inputMode="decimal"
            min="1"
            max="100000"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={t.advertiserDashboard.addFundsPlaceholder}
            className="w-full min-w-0 flex-1 spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal sm:max-w-[10rem]"
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="border-amber-300/60 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30"
            onClick={() => {
              void addFunds();
            }}
          >
            {busy ? t.advertiserDashboard.redirecting : t.advertiserDashboard.addFunds}
          </Button>
        </div>
        <p className="mt-1.5 text-xs font-semibold text-muted-foreground">
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
