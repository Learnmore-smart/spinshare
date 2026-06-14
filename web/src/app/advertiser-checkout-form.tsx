"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, ImagePlus, Lock, Upload } from "lucide-react";

import { AD_TEXT_MAX_LENGTH } from "@spinshare/core";

import {
  adTextState,
  formatUsd,
  validateCpmDollars,
} from "./dashboard/advertiser/lib";
import { useT } from "@/lib/i18n/locale-provider";
import { translateValidationError } from "@/lib/i18n/translate-validation-error";

const ICON_MAX_BYTES = 64 * 1024;
const ICON_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type SubmitState = "idle" | "submitting";

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
    reader.addEventListener("error", () => reject(new Error("Could not read image file.")));
    reader.readAsDataURL(file);
  });
}

function parseBlockCount(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function AdvertiserCheckoutForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [adText, setAdText] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandIconDataUrl, setBrandIconDataUrl] = useState<string | null>(null);
  const [bidPerBlock, setBidPerBlock] = useState("5.00");
  const [blockCount, setBlockCount] = useState("1");
  const [publicOnLeaderboard, setPublicOnLeaderboard] = useState(true);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [adLineShake, setAdLineShake] = useState(false);

  const text = adTextState(adText);
  const cpm = validateCpmDollars(bidPerBlock);
  const blocks = parseBlockCount(blockCount);
  const amountCents = cpm.ok && blocks !== null ? cpm.cents * blocks : 0;
  const estimatedTotal = useMemo(() => formatUsd(amountCents), [amountCents]);
  const counterClass = text.overLimit
    ? "text-red-600"
    : text.remaining <= 10
      ? "text-amber-600"
      : "text-slate-400";

  async function handleIconChange(event: ChangeEvent<HTMLInputElement>) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!text.valid) {
      if (text.isEmpty) {
        setAdLineShake(true);
        setTimeout(() => setAdLineShake(false), 500);
      } else {
        setError(t.errors.adLineMaxLength(AD_TEXT_MAX_LENGTH));
      }
      return;
    }
    if (!cpm.ok) {
      setError(translateValidationError(cpm.error, t));
      return;
    }
    if (blocks === null) {
      setError(t.errors.blocksWholeNumber);
      return;
    }
    if (amountCents < 100) {
      setError(t.errors.checkoutMinTotal);
      return;
    }

    setSubmitState("submitting");
    try {
      const response = await fetch("/api/advertiser-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          adText,
          destinationUrl,
          brandName,
          brandIconDataUrl: brandIconDataUrl ?? undefined,
          publicOnLeaderboard,
          cpmCents: cpm.cents,
          blockCount: blocks,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (!response.ok || typeof body?.url !== "string") {
        setError(body?.error ?? t.errors.checkoutFailed(response.status));
        return;
      }

      window.location.assign(body.url);
    } catch {
      setError(t.errors.checkoutNetwork);
    } finally {
      setSubmitState("idle");
    }
  }

  return (
    <section id="advertiser-checkout" className="mt-10">
      <div className="liquid-glass spinshare-static overflow-hidden p-5 sm:p-7">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(360px,1fr)] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              {t.nav.advertisers}
            </p>
            <h3 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {t.advertiser.title}
            </h3>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-600">
              {t.advertiser.body}
            </p>

            <div className="mt-6 rounded-[14px] border border-emerald-500/20 bg-emerald-50/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                    {t.advertiser.estimatedTotal}
                  </p>
                  <p className="mt-1 text-sm font-bold text-emerald-950">
                    {t.advertiser.blocksAtPrice(
                      blocks ?? 0,
                      cpm.ok ? formatUsd(cpm.cents) : "$0.00",
                    )}
                  </p>
                </div>
                <p className="shrink-0 text-4xl font-black tracking-tight text-slate-950">
                  {estimatedTotal}
                </p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-[10px] bg-white/75 p-3">
                  <p className="text-lg font-black text-slate-950">
                    {cpm.ok ? formatUsd(cpm.cents) : "$0.00"}
                  </p>
                  <p className="text-xs font-bold text-slate-500">{t.advertiser.perBlock}</p>
                </div>
                <div className="rounded-[10px] bg-white/75 p-3">
                  <p className="text-lg font-black text-slate-950">{blocks ?? 0}</p>
                  <p className="text-xs font-bold text-slate-500">{t.advertiser.blocks}</p>
                </div>
                <div className="rounded-[10px] bg-white/75 p-3">
                  <p className="text-lg font-black text-slate-950">
                    {((blocks ?? 0) * 1000).toLocaleString("en-US")}
                  </p>
                  <p className="text-xs font-bold text-slate-500">{t.advertiser.totalViews}</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {t.advertiser.email}
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t.advertiser.emailPlaceholder}
                  className="spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {t.advertiser.destinationUrl}
                <input
                  type="url"
                  value={destinationUrl}
                  onChange={(event) => setDestinationUrl(event.target.value)}
                  placeholder={t.advertiser.destinationPlaceholder}
                  className="spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal"
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <span className="flex items-center justify-between gap-3">
                <span>{t.advertiser.adLine}</span>
                <span className={`tabular-nums ${counterClass}`}>
                  {text.length}/{AD_TEXT_MAX_LENGTH}
                </span>
              </span>
              <input
                type="text"
                value={adText}
                maxLength={AD_TEXT_MAX_LENGTH}
                onChange={(event) => { setAdText(event.target.value); if (adLineShake) setAdLineShake(false); }}
                placeholder={t.advertiser.adLinePlaceholder}
                className={`spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal${adLineShake ? " !border-red-500 !ring-2 !ring-red-300 animate-shake" : ""}`}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {t.advertiser.brandName}
                <input
                  type="text"
                  value={brandName}
                  onChange={(event) => setBrandName(event.target.value)}
                  placeholder={t.advertiser.brandNamePlaceholder}
                  className="spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {t.advertiser.brandIcon}
                <span className="spinshare-input flex min-h-[42px] cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-500">
                  <span className="flex min-w-0 items-center gap-2">
                    {brandIconDataUrl ? (
                      <ImagePlus className="h-4 w-4 shrink-0 text-emerald-700" />
                    ) : (
                      <Upload className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {brandIconDataUrl ? t.advertiser.iconReady : t.advertiser.iconHint}
                    </span>
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

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[12px] border border-emerald-500/20 bg-white/60 px-3 py-2.5 text-sm font-bold text-slate-700">
              <span className="flex min-w-0 items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-emerald-700" />
                <span>{t.advertiser.showOnLeaderboard}</span>
              </span>
              <span className="relative shrink-0">
                <input
                  type="checkbox"
                  checked={publicOnLeaderboard}
                  onChange={(event) => setPublicOnLeaderboard(event.target.checked)}
                  className="peer sr-only"
                />
                <span className="flex h-6 w-6 items-center justify-center rounded-[7px] border border-slate-300 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.06)] transition peer-checked:border-emerald-600 peer-checked:bg-emerald-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400/50 peer-focus-visible:ring-offset-2">
                  <Check className="h-3.5 w-3.5 opacity-0 transition peer-checked:opacity-100" />
                </span>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {t.advertiser.bidPerBlock}
                <input
                  type="number"
                  min="0.01"
                  max="1000"
                  step="0.01"
                  inputMode="decimal"
                  value={bidPerBlock}
                  onChange={(event) => setBidPerBlock(event.target.value)}
                  className="spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {t.advertiser.numberOfBlocks}
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={blockCount}
                  onChange={(event) => setBlockCount(event.target.value)}
                  className="spinshare-input px-3 py-2.5 text-sm font-semibold normal-case tracking-normal"
                />
              </label>
            </div>

            {error !== null && (
              <p className="rounded-[10px] bg-red-50 px-3 py-2 text-sm font-bold text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitState === "submitting"}
              className="spinshare-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitState === "submitting" ? t.advertiser.openingStripe : t.advertiser.checkoutStripe}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
