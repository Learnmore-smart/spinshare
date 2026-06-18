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

interface PayoutFailureCopy {
  generic: string;
  connectNotEnabled: string;
  withRequestId: (message: string, requestId: string) => string;
}

interface PayoutButtonCopy {
  connectPayouts: string;
  payoutFinishOnboarding: string;
  payoutVerificationPending: string;
  payoutLockedUntilMinimum: (minimum: string) => string;
  payoutConnecting: string;
  payoutProcessing: string;
  cashOut: (amount: string) => string;
}

type PayoutAction = "connect" | "withdraw";

interface PayoutButtonStateInput {
  status: PayoutStatus | null;
  phase: Phase;
  eligible: boolean;
  balanceLabel: string;
  minimumLabel: string;
  copy: PayoutButtonCopy;
}

interface PayoutButtonState {
  action: PayoutAction | null;
  disabled: boolean;
  label: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function formatPayoutFailureMessage(
  body: unknown,
  copy: PayoutFailureCopy,
): string {
  let message = copy.generic;

  if (isRecord(body)) {
    if (body.reason === "stripe_connect_not_enabled") {
      message = copy.connectNotEnabled;
    } else if (
      typeof body.message === "string" &&
      body.message.trim().length > 0
    ) {
      message = body.message;
    }

    if (
      typeof body.requestId === "string" &&
      body.requestId.trim().length > 0
    ) {
      return copy.withRequestId(message, body.requestId);
    }
  }

  return message;
}

export function getPayoutButtonState(
  input: PayoutButtonStateInput,
): PayoutButtonState {
  const { status, phase, eligible, balanceLabel, minimumLabel, copy } = input;
  const connectedAndEnabled =
    status?.connected === true && status.payoutsEnabled === true;
  const verifying =
    status?.connected === true &&
    status.payoutsEnabled !== true &&
    status.detailsSubmitted === true;

  if (phase === "connecting") {
    return {
      action: null,
      disabled: true,
      label: copy.payoutConnecting,
    };
  }

  if (phase === "processing") {
    return {
      action: null,
      disabled: true,
      label: copy.payoutProcessing,
    };
  }

  if (phase === "loading") {
    return {
      action: null,
      disabled: true,
      label: copy.connectPayouts,
    };
  }

  if (verifying) {
    return {
      action: null,
      disabled: true,
      label: copy.payoutVerificationPending,
    };
  }

  if (!eligible) {
    return {
      action: null,
      disabled: true,
      label: copy.payoutLockedUntilMinimum(minimumLabel),
    };
  }

  if (connectedAndEnabled) {
    return {
      action: "withdraw",
      disabled: false,
      label: copy.cashOut(balanceLabel),
    };
  }

  if (status?.connected === true) {
    return {
      action: "connect",
      disabled: false,
      label: copy.payoutFinishOnboarding,
    };
  }

  return {
    action: "connect",
    disabled: false,
    label: copy.connectPayouts,
  };
}

async function readPayoutFailureMessage(
  response: Response,
  copy: PayoutFailureCopy,
): Promise<string> {
  try {
    return formatPayoutFailureMessage(await response.json(), copy);
  } catch {
    return copy.generic;
  }
}

export function PayoutPanel() {
  const t = useT();
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const payoutFailureCopy: PayoutFailureCopy = {
    generic: t.developerDashboard.payoutError,
    connectNotEnabled: t.developerDashboard.payoutConnectNotEnabled,
    withRequestId: t.developerDashboard.payoutErrorWithRequestId,
  };

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
      if (!res.ok) {
        setPhase("error");
        setMessage(await readPayoutFailureMessage(res, payoutFailureCopy));
        return;
      }
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
      if (!res.ok) {
        setPhase("error");
        setMessage(await readPayoutFailureMessage(res, payoutFailureCopy));
        return;
      }
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
  const verifying =
    status?.connected === true &&
    status.payoutsEnabled !== true &&
    status.detailsSubmitted === true;
  const buttonState = getPayoutButtonState({
    status,
    phase,
    eligible,
    balanceLabel: money(balanceCents),
    minimumLabel: money(MINIMUM_PAYOUT_CENTS),
    copy: {
      connectPayouts: t.developerDashboard.connectPayouts,
      payoutFinishOnboarding: t.developerDashboard.payoutFinishOnboarding,
      payoutVerificationPending: t.developerDashboard.payoutVerificationPending,
      payoutLockedUntilMinimum: t.developerDashboard.payoutLockedUntilMinimum,
      payoutConnecting: t.developerDashboard.payoutConnecting,
      payoutProcessing: t.developerDashboard.payoutProcessing,
      cashOut: t.developerDashboard.cashOut,
    },
  });

  const onClick =
    buttonState.action === "withdraw"
      ? handleWithdraw
      : buttonState.action === "connect"
        ? handleConnect
        : undefined;

  const caption = (() => {
    if (message !== null) return message;
    if (verifying)
      return t.developerDashboard.payoutVerificationCaption(
        money(MINIMUM_PAYOUT_CENTS),
      );
    if (!eligible)
      return t.developerDashboard.payoutBelowMinimum(money(remainingCents));
    return t.developerDashboard.payoutAboveMinimum;
  })();

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick?.()}
        disabled={buttonState.disabled}
        className="spinshare-btn-primary mt-4 min-h-11 w-full justify-center rounded-full text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        {buttonState.label}
      </button>
      <p className="dev-dash-section-caption">{caption}</p>
    </>
  );
}
