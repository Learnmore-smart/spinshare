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

import { type ChangeEvent, type FormEvent, useState } from "react";
import { AD_TEXT_MAX_LENGTH } from "@spinshare/core";

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

import { adTextState, validateCpmDollars, type CampaignView } from "./lib";

const ICON_MAX_BYTES = 64 * 1024;
const ICON_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image file."));
      }
    });
    reader.addEventListener("error", () =>
      reject(new Error("Could not read image file.")),
    );
    reader.readAsDataURL(file);
  });
}

/** Props for {@link CampaignBuilder}. */
export interface CampaignBuilderProps {
  /** Bearer `Device_Auth_Token` for the authenticated advertiser. */
  token: string;
  /** Invoked with the freshly created campaign on a successful `201`. */
  onCreated: (campaign: CampaignView) => void;
}

export function CampaignBuilder({ token, onCreated }: CampaignBuilderProps) {
  const t = useT();
  const [adText, setAdText] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandIconDataUrl, setBrandIconDataUrl] = useState<string | null>(null);
  const [publicOnLeaderboard, setPublicOnLeaderboard] = useState(true);
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

  async function handleIconChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) {
      setBrandIconDataUrl(null);
      return;
    }
    if (!ICON_TYPES.has(file.type)) {
      setError("Brand icon must be a PNG, JPG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > ICON_MAX_BYTES) {
      setError("Brand icon must be 64 KB or smaller.");
      event.target.value = "";
      return;
    }
    try {
      setBrandIconDataUrl(await readFileAsDataUrl(file));
    } catch {
      setError("Could not read the brand icon. Try another image.");
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate locally against the shared bounds before hitting the network.
    if (!text.valid) {
      setError(
        text.isEmpty
          ? t.advertiserDashboard.adTextRequired
          : t.advertiserDashboard.adTextMaxLength(AD_TEXT_MAX_LENGTH),
      );
      return;
    }
    const trimmedUrl = destinationUrl.trim();
    if (trimmedUrl.length > 0 && !/^https:\/\//i.test(trimmedUrl)) {
      setError(t.advertiserDashboard.destinationHttps);
      return;
    }
    const cpmResult = validateCpmDollars(cpm);
    if (!cpmResult.ok) {
      setError(translateValidationError(cpmResult.error, t));
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
        body: JSON.stringify({
          adText,
          cpmCents: cpmResult.cents,
          ...(trimmedUrl.length > 0 ? { destinationUrl: trimmedUrl } : {}),
          ...(brandName.trim().length > 0
            ? { brandName: brandName.trim() }
            : {}),
          ...(brandIconDataUrl ? { brandIconDataUrl } : {}),
          publicOnLeaderboard,
        }),
      });

      if (response.status === 201) {
        const created = (await response.json()) as CampaignView;
        onCreated(created);
        setAdText("");
        setDestinationUrl("");
        setBrandName("");
        setBrandIconDataUrl(null);
        setPublicOnLeaderboard(true);
        setCpm("");
        setSuccess(t.advertiserDashboard.campaignCreated);
        return;
      }
      if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? t.advertiserDashboard.campaignRejected);
        return;
      }
      if (response.status === 401) {
        setError(t.advertiserDashboard.sessionExpired);
        return;
      }
      setError(t.advertiserDashboard.createError(response.status));
    } catch {
      setError(t.advertiserDashboard.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">{t.advertiserDashboard.newCampaign}</CardTitle>
        <CardDescription>
          {t.advertiserDashboard.newCampaignDesc}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="adText" className="text-sm font-medium">
                {t.advertiserDashboard.adText}
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
              placeholder={t.advertiserDashboard.adTextPlaceholder}
              className="spinshare-input px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="destinationUrl" className="text-sm font-medium">
              {t.advertiserDashboard.destinationUrl}
            </label>
            <input
              id="destinationUrl"
              name="destinationUrl"
              type="url"
              value={destinationUrl}
              onChange={(event) => setDestinationUrl(event.target.value)}
              placeholder={t.advertiserDashboard.destinationPlaceholder}
              className="spinshare-input px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t.advertiserDashboard.destinationHint}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="brandName" className="text-sm font-medium">
              {t.advertiserDashboard.brandName}
            </label>
            <input
              id="brandName"
              name="brandName"
              type="text"
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              placeholder={t.advertiserDashboard.brandNamePlaceholder}
              className="spinshare-input px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="brandIcon" className="text-sm font-medium">
              {t.advertiserDashboard.brandIcon}
            </label>
            <input
              id="brandIcon"
              name="brandIcon"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleIconChange}
              className="spinshare-input px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
            />
            <p className="text-xs text-muted-foreground">
              {brandIconDataUrl
                ? t.advertiserDashboard.iconReady
                : t.advertiserDashboard.iconHint}
            </p>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
            <span>{t.advertiserDashboard.showOnLeaderboard}</span>
            <input
              type="checkbox"
              checked={publicOnLeaderboard}
              onChange={(event) =>
                setPublicOnLeaderboard(event.target.checked)
              }
              className="h-4 w-4"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cpm" className="text-sm font-medium">
              {t.advertiserDashboard.maxCpmBid}
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
              placeholder={t.advertiserDashboard.cpmPlaceholder}
              className="spinshare-input px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t.advertiserDashboard.cpmHint}
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
            {submitting ? t.advertiserDashboard.creating : t.advertiserDashboard.createCampaign}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
