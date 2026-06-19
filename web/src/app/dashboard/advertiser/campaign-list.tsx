"use client";

/**
 * Campaign grid — detail cards with inline edit + buy-more-impressions.
 *
 * Each card surfaces the campaign's editable details (ad text, destination
 * link, brand, max CPM) and a derived status, so an advertiser can SEE exactly
 * where clicks go (the destination URL is shown explicitly — a missing link is
 * called out) and EDIT it in place before paying. Editing PATCHes
 * `/api/campaigns` (via the dashboard context) and re-runs content review; the
 * buy control funds the campaign and can re-price the max CPM for future bids.
 *
 * Stats/diagnostics are shown only once a campaign has been funded or has
 * delivered; an unfunded campaign foregrounds the buy CTA instead.
 */

import { type ChangeEvent, useId, useState } from "react";
import {
  BarChart3,
  CreditCard,
  Layers,
  TrendingUp,
  Eye,
  CheckCircle2,
  MousePointerClick,
  Percent,
  Info,
  Link2,
  Unlink,
  Pencil,
  Check,
  X,
  Upload,
  ExternalLink,
  ShieldAlert,
  Clock,
} from "lucide-react";

import { AD_TEXT_MAX_LENGTH, BRAND_ICON_FILE_MAX_BYTES } from "@spinshare/core";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-provider";
import { translateValidationError } from "@/lib/i18n/translate-validation-error";

import {
  useAdvertiserDashboard,
  type DeleteCampaignResult,
} from "./advertiser-dashboard-context";
import {
  adTextState,
  campaignTelemetry,
  type CampaignDisplayStatus,
  deliveryProgress,
  displayStatus,
  formatCount,
  formatCtr,
  formatUsd,
  isNeverFunded,
  nonCreditTotal,
  validateCpmDollars,
  validateFundingBlocks,
  type CampaignView,
} from "./lib";

const ICON_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type DiagnosticLabelKey =
  | "uncredited"
  | "tooShort"
  | "authIssues"
  | "antiAbuse"
  | "duplicate";

type DiagnosticDescriptionKey =
  | "uncreditedDescription"
  | "tooShortDescription"
  | "authIssuesDescription"
  | "antiAbuseDescription"
  | "duplicateDescription";

const DIAGNOSTIC_BADGES: readonly {
  key: DiagnosticLabelKey;
  descriptionKey: DiagnosticDescriptionKey;
}[] = [
  { key: "uncredited", descriptionKey: "uncreditedDescription" },
  { key: "tooShort", descriptionKey: "tooShortDescription" },
  { key: "authIssues", descriptionKey: "authIssuesDescription" },
  { key: "antiAbuse", descriptionKey: "antiAbuseDescription" },
  { key: "duplicate", descriptionKey: "duplicateDescription" },
];

/** Props for {@link CampaignList}. */
export interface CampaignListProps {
  /** Bearer `Device_Auth_Token` for the authenticated advertiser. */
  token: string;
  /** Campaigns owned by the advertiser, already enriched with USD strings. */
  campaigns: CampaignView[];
  /** Permanently deletes an unpaid campaign after server-side ownership checks. */
  deleteCampaign?: (campaignId: string) => Promise<DeleteCampaignResult>;
}

export function CampaignList({
  token,
  campaigns,
  deleteCampaign = async () => ({ ok: true }),
}: CampaignListProps) {
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
    <ul className="adv-camp-grid" data-testid="campaigns-list">
      {campaigns.map((campaign) => (
        <li key={campaign.id} className="adv-camp-grid-item">
          <CampaignCard
            token={token}
            campaign={campaign}
            deleteCampaign={deleteCampaign}
          />
        </li>
      ))}
    </ul>
  );
}

const STATUS_LABEL: Record<CampaignDisplayStatus, (t: ReturnType<typeof useT>) => string> = {
  active: (t) => t.advertiserDashboard.statusActive,
  unfunded: (t) => t.advertiserDashboard.statusUnfunded,
  needsLink: (t) => t.advertiserDashboard.statusNeedsLink,
  paused: (t) => t.advertiserDashboard.statusPaused,
  underReview: (t) => t.advertiserDashboard.statusUnderReview,
  rejected: (t) => t.advertiserDashboard.statusRejected,
};

function StatusBadge({ status }: { status: CampaignDisplayStatus }) {
  const t = useT();
  return (
    <span className={`adv-status-badge adv-status-badge--${status}`}>
      <span className={`adv-status-dot adv-status-dot--${status}`} />
      {STATUS_LABEL[status](t)}
    </span>
  );
}

function DiagnosticTag({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: number;
}) {
  const tooltipId = useId();

  return (
    <span
      className={`adv-diag-tag ${value > 0 ? "adv-diag-tag--warning" : "adv-diag-tag--zero"}`}
      tabIndex={0}
      aria-describedby={tooltipId}
    >
      <Info className="h-3 w-3" aria-hidden />
      <span className="adv-diag-label">{label}</span>
      <strong>{formatCount(value)}</strong>
      <span id={tooltipId} role="tooltip" className="adv-diag-tooltip">
        {description}
      </span>
    </span>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("read")),
    );
    reader.addEventListener("error", () => reject(new Error("read")));
    reader.readAsDataURL(file);
  });
}

/** A single campaign card: details (view), inline edit, and buy control. */
function CampaignCard({
  token,
  campaign,
  deleteCampaign,
}: {
  token: string;
  campaign: CampaignView;
  deleteCampaign: (campaignId: string) => Promise<DeleteCampaignResult>;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);

  const status = displayStatus(campaign);
  const neverFunded = isNeverFunded(campaign);

  return (
    <article className={`adv-camp-card adv-camp-card--${status}`} data-testid="campaign-card">
      <div className="adv-camp-card-head">
        <div className="adv-camp-brand">
          {campaign.brandIconDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL brand icon
            <img src={campaign.brandIconDataUrl} alt="" className="adv-camp-brand-icon" />
          ) : (
            <span className="adv-camp-brand-icon adv-camp-brand-icon--placeholder">
              <Layers className="h-4 w-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            {campaign.brandName ? (
              <p className="adv-camp-brand-name">{campaign.brandName}</p>
            ) : null}
            <StatusBadge status={status} />
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            className="adv-camp-edit-btn"
            onClick={() => setEditing(true)}
            aria-label={t.advertiserDashboard.edit}
            title={t.advertiserDashboard.edit}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            {t.advertiserDashboard.edit}
          </button>
        )}
      </div>

      {editing ? (
        <CampaignEditForm
          campaign={campaign}
          onDone={() => setEditing(false)}
        />
      ) : (
        <CampaignCardBody
          token={token}
          campaign={campaign}
          status={status}
          neverFunded={neverFunded}
          deleteCampaign={deleteCampaign}
        />
      )}
    </article>
  );
}

function CampaignCardBody({
  token,
  campaign,
  status,
  neverFunded,
  deleteCampaign,
}: {
  token: string;
  campaign: CampaignView;
  status: CampaignDisplayStatus;
  neverFunded: boolean;
  deleteCampaign: (campaignId: string) => Promise<DeleteCampaignResult>;
}) {
  const t = useT();
  const telemetry = campaignTelemetry(campaign);
  const uncredited = nonCreditTotal(telemetry);
  const antiAbuse = telemetry.shadowBanned + telemetry.earningCapped;
  const delivery = deliveryProgress(campaign, telemetry.credited);
  const diagnosticValues: Record<DiagnosticLabelKey, number> = {
    uncredited,
    tooShort: telemetry.tooShort,
    authIssues: telemetry.invalidToken,
    antiAbuse,
    duplicate: telemetry.duplicate,
  };

  return (
    <>
      {status === "rejected" && (
        <div className="adv-camp-review adv-camp-review--rejected" role="alert">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
          <span>{t.advertiserDashboard.reviewRejectedHint}</span>
        </div>
      )}
      {status === "underReview" && (
        <div className="adv-camp-review adv-camp-review--pending">
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          <span>{t.advertiserDashboard.reviewPendingHint}</span>
        </div>
      )}

      <p className="adv-camp-adtext">{campaign.adText}</p>

      <div className="adv-camp-detail-rows">
        <div className="adv-camp-detail-row">
          {campaign.destinationUrl ? (
            <a
              href={campaign.destinationUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="adv-camp-dest"
              title={campaign.destinationUrl}
            >
              <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="adv-camp-dest-url">{campaign.destinationUrl}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
            </a>
          ) : (
            <span className="adv-camp-dest adv-camp-dest--none">
              <Unlink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t.advertiserDashboard.noDestination}
            </span>
          )}
        </div>
        <div className="adv-camp-detail-row adv-camp-detail-row--cpm">
          <span className="adv-camp-cpm">
            <TrendingUp className="h-3.5 w-3.5 text-amber-500" aria-hidden />
            {t.advertiserDashboard.maxCpm}
            <strong>{formatUsd(campaign.cpmCents)}</strong>
          </span>
        </div>
      </div>

      {neverFunded ? (
        <div className="adv-camp-unfunded">
          <div className="adv-camp-unfunded-icon">
            <CreditCard className="h-5 w-5" aria-hidden />
          </div>
          <p className="adv-camp-unfunded-title">{t.advertiserDashboard.neverFundedTitle}</p>
          <p className="adv-camp-unfunded-body">{t.advertiserDashboard.neverFundedDesc}</p>
        </div>
      ) : (
        <>
          <div className="adv-camp-delivery">
            <div className="adv-camp-delivery-head">
              <span className="adv-camp-delivery-label">
                <BarChart3 className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                {t.advertiserDashboard.totalServed}
              </span>
              <strong className="adv-camp-delivery-value">
                {formatCount(telemetry.credited)}/{formatCount(delivery.purchased)}
              </strong>
            </div>
            <div
              className="adv-dash-campaign-progress-track"
              role="progressbar"
              aria-label="Campaign delivery progress"
              aria-valuemin={0}
              aria-valuemax={delivery.purchased}
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
            {DIAGNOSTIC_BADGES.map(({ key, descriptionKey }) => (
              <DiagnosticTag
                key={key}
                label={t.advertiserDashboard[key]}
                description={t.advertiserDashboard[descriptionKey]}
                value={diagnosticValues[key]}
              />
            ))}
          </div>
        </>
      )}

      <BuyControl
        token={token}
        campaign={campaign}
        canDelete={neverFunded}
        deleteCampaign={deleteCampaign}
      />
    </>
  );
}

/** Inline edit form: ad text, destination, brand, icon, leaderboard. */
function CampaignEditForm({
  campaign,
  onDone,
}: {
  campaign: CampaignView;
  onDone: () => void;
}) {
  const t = useT();
  const { updateCampaign } = useAdvertiserDashboard();
  const [adText, setAdText] = useState(campaign.adText);
  const [destinationUrl, setDestinationUrl] = useState(campaign.destinationUrl ?? "");
  const [brandName, setBrandName] = useState(campaign.brandName ?? "");
  const [brandIconDataUrl, setBrandIconDataUrl] = useState<string | null>(
    campaign.brandIconDataUrl ?? null,
  );
  const [publicOnLeaderboard, setPublicOnLeaderboard] = useState(
    campaign.publicOnLeaderboard !== false,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = adTextState(adText);

  async function handleIconChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ICON_TYPES.has(file.type)) {
      setError(t.errors.iconType);
      event.target.value = "";
      return;
    }
    if (file.size > BRAND_ICON_FILE_MAX_BYTES) {
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

  async function handleSave(): Promise<void> {
    setError(null);
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

    // Send only changed fields.
    const patch: Parameters<typeof updateCampaign>[1] = {};
    if (adText !== campaign.adText) patch.adText = adText;
    if (trimmedUrl !== (campaign.destinationUrl ?? "")) {
      if (trimmedUrl.length > 0) patch.destinationUrl = trimmedUrl;
    }
    const trimmedBrand = brandName.trim();
    if (trimmedBrand !== (campaign.brandName ?? "")) {
      if (trimmedBrand.length > 0) patch.brandName = trimmedBrand;
    }
    if ((brandIconDataUrl ?? "") !== (campaign.brandIconDataUrl ?? "")) {
      if (brandIconDataUrl) patch.brandIconDataUrl = brandIconDataUrl;
    }
    if (publicOnLeaderboard !== (campaign.publicOnLeaderboard !== false)) {
      patch.publicOnLeaderboard = publicOnLeaderboard;
    }

    if (Object.keys(patch).length === 0) {
      onDone();
      return;
    }

    setBusy(true);
    const result = await updateCampaign(campaign.id, patch);
    setBusy(false);
    if (result.ok) {
      onDone();
    } else {
      setError(translateValidationError(result.error, t));
    }
  }

  return (
    <div className="adv-camp-edit" data-testid="campaign-edit">
      <p className="adv-camp-edit-title">{t.advertiserDashboard.editTitle}</p>

      <label className="adv-dash-field-label">
        <span className="flex items-baseline justify-between gap-3">
          <span>{t.advertiserDashboard.adText}</span>
          <span className={`text-xs font-bold tabular-nums ${text.overLimit ? "text-destructive" : "text-muted-foreground"}`}>
            {text.length}/{AD_TEXT_MAX_LENGTH}
          </span>
        </span>
        <input
          type="text"
          value={adText}
          maxLength={AD_TEXT_MAX_LENGTH}
          onChange={(e) => setAdText(e.target.value)}
          className="spinshare-input px-3 py-2 text-sm font-semibold normal-case tracking-normal"
        />
      </label>

      <label className="adv-dash-field-label">
        {t.advertiserDashboard.destinationUrl}
        <input
          type="url"
          value={destinationUrl}
          onChange={(e) => setDestinationUrl(e.target.value)}
          placeholder={t.advertiserDashboard.destinationPlaceholder}
          className="spinshare-input px-3 py-2 text-sm font-semibold normal-case tracking-normal"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="adv-dash-field-label">
          {t.advertiserDashboard.brandName}
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder={t.advertiserDashboard.brandNamePlaceholder}
            className="spinshare-input px-3 py-2 text-sm font-semibold normal-case tracking-normal"
          />
        </label>
        <label className="adv-dash-field-label">
          {t.advertiserDashboard.brandIcon}
          <span className="spinshare-input flex h-[38px] cursor-pointer items-center gap-2 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[var(--text-secondary)]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden">
              {brandIconDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL preview
                <img src={brandIconDataUrl} alt="" className="max-h-5 max-w-5 object-contain" />
              ) : (
                <Upload className="h-4 w-4" aria-hidden />
              )}
            </span>
            <span className="truncate">
              {brandIconDataUrl ? t.advertiserDashboard.iconReady : t.advertiserDashboard.iconHint}
            </span>
            <input
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
            onChange={(e) => setPublicOnLeaderboard(e.target.checked)}
            className="peer sr-only"
          />
          <span className="adv-dash-toggle-box peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400/50">
            <Check className="h-3.5 w-3.5" />
          </span>
        </span>
      </label>

      {error !== null && (
        <p className="text-sm font-semibold text-destructive" role="alert">{error}</p>
      )}

      <div className="adv-camp-edit-actions">
        <Button
          type="button"
          variant="default"
          disabled={busy || !text.valid}
          className="adv-dash-campaign-buy-button font-bold text-white"
          onClick={() => void handleSave()}
        >
          <Check className="h-4 w-4" aria-hidden />
          {busy ? t.advertiserDashboard.saving : t.advertiserDashboard.save}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onDone}>
          <X className="h-4 w-4" aria-hidden />
          {t.advertiserDashboard.cancel}
        </Button>
      </div>
    </div>
  );
}

/** Buy-more-impressions control: block count + optional new CPM. */
function BuyControl({
  token,
  campaign,
  canDelete,
  deleteCampaign,
}: {
  token: string;
  campaign: CampaignView;
  canDelete: boolean;
  deleteCampaign: (campaignId: string) => Promise<DeleteCampaignResult>;
}) {
  const t = useT();
  const [blocks, setBlocks] = useState("");
  const [newCpm, setNewCpm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function buyMoreImpressions(): Promise<void> {
    setError(null);

    const blockResult = validateFundingBlocks(blocks);
    if (!blockResult.ok) {
      setError(translateValidationError(blockResult.error, t));
      return;
    }

    // CPM is optional; empty keeps the campaign's current CPM.
    let cpmCents: number | undefined;
    const trimmedCpm = newCpm.trim();
    if (trimmedCpm.length > 0) {
      const cpmResult = validateCpmDollars(trimmedCpm);
      if (!cpmResult.ok) {
        setError(translateValidationError(cpmResult.error, t));
        return;
      }
      cpmCents = cpmResult.cents;
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
          blockCount: blockResult.blocks,
          ...(cpmCents !== undefined ? { cpmCents } : {}),
        }),
      });

      if (response.ok) {
        const body = (await response.json()) as { url: string };
        window.location.href = body.url;
        return;
      }
      if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
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

  async function deleteUnpaidCampaign(): Promise<void> {
    setError(null);
    setDeleteBusy(true);
    const result = await deleteCampaign(campaign.id);
    setDeleteBusy(false);
    if (!result.ok) {
      setError(result.error);
    }
  }

  return (
    <div className="adv-camp-buy">
      <label htmlFor={`funds-${campaign.id}`} className="adv-dash-campaign-buy-label">
        <CreditCard className="h-4 w-4" aria-hidden />
        {t.advertiserDashboard.addFundsLabel}
      </label>
      <div className="adv-camp-buy-fields">
        <div className="adv-camp-buy-field">
          <span className="adv-camp-buy-field-label">{t.advertiserDashboard.impressionBlocks}</span>
          <input
            id={`funds-${campaign.id}`}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={blocks}
            onChange={(e) => setBlocks(e.target.value)}
            placeholder={t.advertiserDashboard.addFundsPlaceholder}
            className="spinshare-input px-3 py-2 text-sm font-semibold normal-case tracking-normal"
          />
        </div>
        <div className="adv-camp-buy-field">
          <span className="adv-camp-buy-field-label">{t.advertiserDashboard.newCpmLabel}</span>
          <input
            type="number"
            inputMode="decimal"
            min="1"
            max="1000"
            step="0.01"
            value={newCpm}
            onChange={(e) => setNewCpm(e.target.value)}
            placeholder={formatUsd(campaign.cpmCents).replace("$", "")}
            className="spinshare-input px-3 py-2 text-sm font-semibold normal-case tracking-normal"
          />
        </div>
      </div>
      <div className="adv-camp-buy-actions">
        <Button
          type="button"
          variant="default"
          disabled={busy || deleteBusy}
          className="adv-dash-campaign-buy-button font-bold text-white"
          onClick={() => void buyMoreImpressions()}
        >
          <CreditCard className="h-4 w-4" aria-hidden />
          {busy ? t.advertiserDashboard.redirecting : t.advertiserDashboard.addFunds}
        </Button>
        {canDelete ? (
          <button
            type="button"
            className="adv-camp-delete-btn"
            disabled={busy || deleteBusy}
            onClick={() => void deleteUnpaidCampaign()}
            aria-label={t.advertiserDashboard.cancel}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {t.advertiserDashboard.cancel}
          </button>
        ) : null}
      </div>
      <p className="adv-dash-campaign-buy-hint">{t.advertiserDashboard.addFundsHint}</p>
      {error !== null && (
        <p className="mt-1 text-sm font-semibold text-destructive" role="alert">{error}</p>
      )}
    </div>
  );
}
