"use client";

/**
 * Campaign builder form (task 12.4).
 *
 * A client component that lets an authenticated advertiser create a campaign:
 *   - an ad-text field with a **live 60-char counter** that enforces the limit
 *     (R9.1, R9.2) and flags empty/whitespace-only input (R9.3),
 *   - a CPM bid field constrained to $0.01–$1,000.00 (R9.1, R9.4).
 *
 * On submit it validates locally against the shared core bounds (so the UI
 * never sends a request the API would reject), then `POST`s to `/api/campaigns`
 * with the bearer `Device_Auth_Token` minted for the session. Field-level
 * server errors (`400`) are surfaced inline; on `201` the created campaign is
 * handed up via {@link onCreated} and the form resets.
 */

import { type FormEvent, useState } from "react";
import { AD_TEXT_MAX_LENGTH } from "@spinshare/core";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { adTextState, validateCpmDollars, type CampaignView } from "./lib";

/** Props for {@link CampaignBuilder}. */
export interface CampaignBuilderProps {
  /** Bearer `Device_Auth_Token` for the authenticated advertiser. */
  token: string;
  /** Invoked with the freshly created campaign on a successful `201`. */
  onCreated: (campaign: CampaignView) => void;
}

export function CampaignBuilder({ token, onCreated }: CampaignBuilderProps) {
  const [adText, setAdText] = useState("");
  const [cpm, setCpm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const text = adTextState(adText);
  const counterClass = text.overLimit
    ? "text-destructive"
    : text.remaining <= 10
      ? "text-yellow-400"
      : "text-muted-foreground";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate locally against the shared bounds before hitting the network.
    if (!text.valid) {
      setError(
        text.isEmpty
          ? "Ad text is required."
          : `Ad text must be at most ${AD_TEXT_MAX_LENGTH} characters.`,
      );
      return;
    }
    const cpmResult = validateCpmDollars(cpm);
    if (!cpmResult.ok) {
      setError(cpmResult.error);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adText, cpmCents: cpmResult.cents }),
      });

      if (response.status === 201) {
        const created = (await response.json()) as CampaignView;
        onCreated(created);
        setAdText("");
        setCpm("");
        setSuccess("Campaign created. Add funds below to start bidding.");
        return;
      }
      if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "The campaign details were rejected.");
        return;
      }
      if (response.status === 401) {
        setError("Your session has expired. Refresh the page to sign in again.");
        return;
      }
      setError(`Could not create the campaign (error ${response.status}).`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">New campaign</CardTitle>
        <CardDescription>
          Write your ad copy and set a max CPM bid. New campaigns start with a $0
          budget — add funds once it&apos;s created.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="adText" className="text-sm font-medium">
                Ad text
              </label>
              <span
                className={`text-xs tabular-nums ${counterClass}`}
                aria-live="polite"
                data-testid="char-counter"
              >
                {text.length}/{AD_TEXT_MAX_LENGTH}
              </span>
            </div>
            <input
              id="adText"
              name="adText"
              type="text"
              value={adText}
              maxLength={AD_TEXT_MAX_LENGTH}
              onChange={(event) => setAdText(event.target.value)}
              placeholder="Ship faster with Acme CI"
              className="spinshare-input px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cpm" className="text-sm font-medium">
              Max CPM bid (USD)
            </label>
            <input
              id="cpm"
              name="cpm"
              type="number"
              inputMode="decimal"
              min="0.01"
              max="1000"
              step="0.01"
              value={cpm}
              onChange={(event) => setCpm(event.target.value)}
              placeholder="0.50"
              className="spinshare-input px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Between $0.01 and $1,000.00 per thousand impressions.
            </p>
          </div>

          {error !== null && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {success !== null && (
            <p className="text-sm text-primary" role="status">
              {success}
            </p>
          )}

          <Button type="submit" disabled={submitting || !text.valid}>
            {submitting ? "Creating…" : "Create campaign"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
