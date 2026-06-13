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

import { formatUsd, validateFundingDollars, type CampaignView } from "./lib";

/** Props for {@link CampaignList}. */
export interface CampaignListProps {
  /** Bearer `Device_Auth_Token` for the authenticated advertiser. */
  token: string;
  /** Campaigns owned by the advertiser, already enriched with USD strings. */
  campaigns: CampaignView[];
}

export function CampaignList({ token, campaigns }: CampaignListProps) {
  if (campaigns.length === 0) {
    return (
      <Card data-testid="campaigns-empty">
        <CardHeader>
          <CardTitle className="text-primary">No campaigns yet</CardTitle>
          <CardDescription>
            Create your first campaign above. Once it&apos;s live and funded, it
            will start bidding for ad slots during developers&apos; AI wait
            states.
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
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addFunds(): Promise<void> {
    setError(null);

    const result = validateFundingDollars(amount);
    if (!result.ok) {
      setError(result.error);
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
        setError(body?.error ?? "The amount was rejected.");
      } else if (response.status === 401) {
        setError("Your session has expired. Refresh the page to sign in again.");
      } else {
        setError(`Could not start checkout (error ${response.status}).`);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
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
            Remaining budget:{" "}
            <span className="font-medium text-primary tabular-nums">
              {formatUsd(campaign.budgetCents)}
            </span>
          </span>
          <span>
            Max CPM:{" "}
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
            Add funds (USD)
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
              placeholder="25.00"
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
              {busy ? "Redirecting…" : "Add Funds"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Between $1.00 and $100,000.00. You&apos;ll complete payment on Stripe.
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
