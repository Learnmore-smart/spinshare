"use client";

/**
 * Campaign builder form (task 12.4).
 *
 * A client component that lets an authenticated advertiser create a campaign:
 *   - an ad-text field with a **live 60-char counter** that enforces the limit
 *     (R9.1, R9.2) and flags empty/whitespace-only input (R9.3),
 *   - a CPM bid field constrained to $1.00–$1,000.00 (R9.1, R9.4).
 *
 * On submit it validates locally against the shared core bounds (so the UI
 * never sends a request the API would reject), then `POST`s to `/api/campaigns`
 * with the bearer `Device_Auth_Token` minted for the session. Field-level
 * server errors (`400`) are surfaced inline; on `201` the created campaign is
 * handed up via {@link onCreated} and the form resets.
 */

import { type ChangeEvent, type FormEvent, useState } from "react";
import { AD_TEXT_MAX_LENGTH } from "@spinshare/core";
import { Check, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
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
      ? "text-amber-500"
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
      setError(t.errors.iconType);
      event.target.value = "";
      return;
    }
    if (file.size > ICON_MAX_BYTES) {
      setError(t.errors.iconSize);
      event.target.value = "";
      return;
    }
    try {
      setBrandIconDataUrl(await readFileAsDataUrl(file));
    } catch {
      setError(t.errors.iconRead);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);

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
    <section className="adv-dash-panel">
      <div className="adv-dash-panel-header">
        <h2 className="adv-dash-panel-title">{t.advertiserDashboard.newCampaign}</h2>
        <p className="adv-dash-panel-desc">{t.advertiserDashboard.newCampaignDesc}</p>
      </div>

      <form onSubmit={handleSubmit} className="adv-dash-panel-body flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-4">
          <label className="adv-dash-field-label">
            <span className="flex items-baseline justify-between gap-3">
              <span>{t.advertiserDashboard.adText}</span>
              <span
                className={`text-xs font-bold tabular-nums ${counterClass}`}
                aria-live="polite"
                data-testid="char-counter"
              >
                {text.length}/{AD_TEXT_MAX_LENGTH}
              </span>
            </span>
            <input
              id="adText"
              name="adText"
              type="text"
              value={adText}
              maxLength={AD_TEXT_MAX_LENGTH}
              onChange={(event) => setAdText(event.target.value)}
              placeholder={t.advertiserDashboard.adTextPlaceholder}
              className="spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal"
            />
          </label>

          <label className="adv-dash-field-label">
            {t.advertiserDashboard.destinationUrl}
            <input
              id="destinationUrl"
              name="destinationUrl"
              type="url"
              value={destinationUrl}
              onChange={(event) => setDestinationUrl(event.target.value)}
              placeholder={t.advertiserDashboard.destinationPlaceholder}
              className="spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal"
            />
            <span className="text-xs font-semibold text-muted-foreground">
              {t.advertiserDashboard.destinationHint}
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="adv-dash-field-label">
              {t.advertiserDashboard.brandName}
              <input
                id="brandName"
                name="brandName"
                type="text"
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder={t.advertiserDashboard.brandNamePlaceholder}
                className="spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal"
              />
            </label>

            <label className="adv-dash-field-label">
              {t.advertiserDashboard.brandIcon}
              <span className="spinshare-input flex h-[42px] cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--text-secondary)]">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden">
                    {brandIconDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL preview
                      <img
                        src={brandIconDataUrl}
                        alt=""
                        className="max-h-6 max-w-6 object-contain"
                      />
                    ) : (
                      <Upload className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                  </span>
                  <span className="truncate">
                    {brandIconDataUrl
                      ? t.advertiserDashboard.iconReady
                      : t.advertiserDashboard.iconHint}
                  </span>
                </span>
                <input
                  id="brandIcon"
                  name="brandIcon"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleIconChange}
                  className="sr-only"
                />
              </span>
            </label>
          </div>

          <label className="adv-dash-toggle">
            <span>{t.advertiserDashboard.showOnLeaderboard}</span>
            <span className="relative shrink-0">
              <input
                type="checkbox"
                checked={publicOnLeaderboard}
                onChange={(event) =>
                  setPublicOnLeaderboard(event.target.checked)
                }
                className="peer sr-only"
              />
              <span className="adv-dash-toggle-box peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400/50 peer-focus-visible:ring-offset-2">
                <Check className="h-3.5 w-3.5" />
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-4">
          <label className="adv-dash-field-label">
            {t.advertiserDashboard.maxCpmBid}
            <input
              id="cpm"
              name="cpm"
              type="number"
              inputMode="decimal"
              min="1"
              max="1000"
              step="0.01"
              value={cpm}
              onChange={(event) => setCpm(event.target.value)}
              placeholder={t.advertiserDashboard.cpmPlaceholder}
              className="spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal"
            />
            <span className="text-xs font-semibold text-muted-foreground">
              {t.advertiserDashboard.cpmHint}
            </span>
          </label>
        </div>

        {error !== null && (
          <p className="text-sm font-semibold text-destructive" role="alert">
            {error}
          </p>
        )}
        {success !== null && (
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400" role="status">
            {success}
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting || !text.valid}
          className="adv-dash-submit-btn w-full bg-amber-600 font-bold shadow-none hover:bg-amber-500 sm:w-auto"
        >
          {submitting ? t.advertiserDashboard.creating : t.advertiserDashboard.createCampaign}
        </Button>
      </form>
    </section>
  );
}
