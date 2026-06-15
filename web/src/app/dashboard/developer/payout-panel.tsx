"use client";

/**
 * PayoutPanel — the live "Get paid" control for the developer dashboard.
 *
 * Replaces the former dead "Connect payouts" button with a real Stripe Connect
 * flow backed by `/api/payouts/*`:
 *   - On mount it loads `/api/payouts/status` (connected? payouts enabled?
 *     available balance?).
 *   - Not connected / onboarding incomplete → "Connect payouts" / "Finish
 *     payout setup" → `POST /api/payouts/connect` → redirect to Stripe's hosted
 *     onboarding (in mock mode this bounces straight back with
 *     `?payouts=connected`).
 *   - Connected + payouts enabled + balance ≥ $5.00 → "Cash out $X" →
 *     `POST /api/payouts/withdraw`.
 *
 * The parent renders the section heading/body; this component owns the button
 * + status caption.
 */

import { useCallback, useEffect, useState } from "react";

import { MINIMUM_PAYOUT_CENTS } from "@spinshare/core";

import { useT } from "@/lib/i18n/locale-provider";

import { money } from "./developer-dashboard-parts";

interface PayoutStatus {
  connected: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  balanceCents: number;
}

type Phase = "loading" | "idle" | "connecting" | "processing" | "done" | "error";

export function PayoutPanel() {
  const t = useT();
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/payouts/status", { cache: "no-store" });
      if (!res.ok) {
        setPhase("idle");
        return;
      }
      setStatus((await res.json()) as PayoutStatus);
      setPhase((prev) => (prev === "loading" ? "idle" : prev));
    } catch {
      setPhase("idle");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleConnect() {
    setPhase("connecting");
    setMessage(null);
    try {
      const res = await fetch("/api/payouts/connect", { method: "POST" });
      if (!res.ok) throw new Error("connect_failed");
      const body = (await res.json()) as { url: string };
      window.location.href = body.url;
    } catch {
      setPhase("error");
      setMessage(t.developerDashboard.payoutError);
    }
  }

  async function handleWithdraw() {
    setPhase("processing");
    setMessage(null);
    try {
      const res = await fetch("/api/payouts/withdraw", { method: "POST" });
      if (!res.ok) throw new Error("withdraw_failed");
      const body = (await res.json()) as { paidOutUsd: string };
      setPhase("done");
      setMessage(t.developerDashboard.payoutSuccess(`$${body.paidOutUsd}`));
      await refresh();
    } catch {
      setPhase("error");
      setMessage(t.developerDashboard.payoutError);
    }
  }

  const balanceCents = status?.balanceCents ?? 0;
  const eligible = balanceCents >= MINIMUM_PAYOUT_CENTS;
  const remainingCents = Math.max(0, MINIMUM_PAYOUT_CENTS - balanceCents);
  const connectedAndEnabled =
    status?.connected === true && status?.payoutsEnabled === true;
  const busy = phase === "connecting" || phase === "processing";

  const buttonLabel = (() => {
    if (phase === "connecting") return t.developerDashboard.payoutConnecting;
    if (phase === "processing") return t.developerDashboard.payoutProcessing;
    if (connectedAndEnabled) return t.developerDashboard.cashOut(money(balanceCents));
    if (status?.connected === true)
      return t.developerDashboard.payoutFinishOnboarding;
    return t.developerDashboard.connectPayouts;
  })();

  const onClick = connectedAndEnabled ? handleWithdraw : handleConnect;
  // Cash-out requires meeting the minimum; connecting/onboarding never does.
  const disabled =
    busy || phase === "loading" || (connectedAndEnabled && !eligible);

  const caption = (() => {
    if (message !== null) return message;
    if (!eligible)
      return t.developerDashboard.payoutBelowMinimum(money(remainingCents));
    return t.developerDashboard.payoutAboveMinimum;
  })();

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={disabled}
        className="spinshare-btn-primary mt-4 min-h-11 w-full justify-center rounded-full text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        {buttonLabel}
      </button>
      <p className="dev-dash-section-caption">{caption}</p>
    </>
  );
}
