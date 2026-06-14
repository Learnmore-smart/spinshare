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

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/i18n/locale-provider";
import { translateValidationError } from "@/lib/i18n/translate-validation-error";

import { formatUsd, validateFundingDollars, type CampaignView } from "./lib";

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
      <Card data-testid="campaigns-empty">
        <CardHeader>
          <CardTitle className="text-primary">{t.advertiserDashboard.noCampaignsTitle}</CardTitle>
          <CardDescription>
            {t.advertiserDashboard.noCampaignsDesc}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-4" data-testid="campaigns-list">
      {campaigns.map((campaign) => (
        <li key={campaign.id}>
          <CampaignCard token={token} campaign={campaign} />
        </li>
      ))}
    </ul>
  );
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
        // Hand off to Stripe's hosted checkout (R9.6).
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">
          {campaign.adText}
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-x-6 gap-y-1">
          <span>
            {t.advertiserDashboard.remainingBudget}{" "}
            <span className="font-medium text-primary tabular-nums">
              {formatUsd(campaign.budgetCents)}
            </span>
          </span>
          <span>
            {t.advertiserDashboard.maxCpm}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatUsd(campaign.cpmCents)}
            </span>
          </span>
          <span className="uppercase tracking-wide text-muted-foreground">
            {campaign.status}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`funds-${campaign.id}`}
            className="text-sm font-medium"
          >
            {t.advertiserDashboard.addFundsLabel}
          </label>
          <div className="flex flex-wrap items-start gap-2">
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
              className="w-40 spinshare-input px-3 py-2 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                void addFunds();
              }}
            >
              {busy ? t.advertiserDashboard.redirecting : t.advertiserDashboard.addFunds}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t.advertiserDashboard.addFundsHint}
          </p>
          {error !== null && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
