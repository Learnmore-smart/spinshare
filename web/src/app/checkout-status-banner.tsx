"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";

export interface CampaignStatusView {
  id: string;
  budgetCents: number;
  publicOnLeaderboard: boolean;
  biddable: boolean;
  leaderboardEligible: boolean;
}

type CheckoutReturn =
  | { kind: "none" }
  | { kind: "cancelled" }
  | { kind: "success"; sessionId: string | null };

export type CheckoutStatusViewState =
  | { kind: "hidden" }
  | { kind: "cancelled" }
  | { kind: "loading"; sessionId: string }
  | { kind: "unknown"; sessionId: string }
  | {
      kind: "pending_webhook";
      sessionId: string;
      campaign?: CampaignStatusView;
    }
  | {
      kind: "funded";
      sessionId: string;
      campaign?: CampaignStatusView;
    }
  | { kind: "error"; sessionId?: string };

interface CheckoutStatusApiResponse {
  sessionId: string;
  status: "unknown" | "pending_webhook" | "funded";
  campaign?: CampaignStatusView;
}

interface CheckoutStatusCopy {
  title: string;
  body: string;
  tone: "success" | "pending" | "warning" | "error";
}

export const CHECKOUT_STATUS_POLL_MS = 2_000;
export const CHECKOUT_STATUS_MAX_POLLS = 15;
export const CHECKOUT_FUNDED_MARKET_REFRESH_EVENT = "spinshare:checkout-funded";

const checkoutSessionIdPattern = /^cs_[A-Za-z0-9_]+$/;

function isCheckoutSessionId(sessionId: string | null): sessionId is string {
  return (
    sessionId !== null &&
    sessionId.length > 0 &&
    sessionId.length <= 200 &&
    checkoutSessionIdPattern.test(sessionId)
  );
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);
}

export function readCheckoutReturn(search: string): CheckoutReturn {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const checkout = params.get("checkout") ?? params.get("funding");

  if (checkout === "cancelled") {
    return { kind: "cancelled" };
  }

  if (checkout === "success") {
    const rawSessionId = params.get("checkout_session_id") ?? params.get("sessionId");
    const sessionId = rawSessionId?.trim() || null;
    return {
      kind: "success",
      sessionId,
    };
  }

  return { kind: "none" };
}

export function checkoutStatusCopy(
  state: Exclude<CheckoutStatusViewState, { kind: "hidden" }>,
): CheckoutStatusCopy {
  switch (state.kind) {
    case "cancelled":
      return {
        title: "Checkout cancelled",
        body: "No payment was recorded. You can edit the campaign and try Stripe checkout again.",
        tone: "warning",
      };
    case "loading":
      return {
        title: "Checking payment status",
        body: "SpinShare is matching your Stripe Checkout Session with the campaign record.",
        tone: "pending",
      };
    case "unknown":
      return {
        title: "Checkout not found yet",
        body: "Stripe returned to SpinShare, but this session is not in the local activity ledger yet. Check the webhook configuration if this stays missing.",
        tone: "warning",
      };
    case "pending_webhook":
      return {
        title: "Payment returned from Stripe",
        body: "SpinShare is waiting for the Stripe webhook to fund this campaign. Refresh in a moment if it does not appear yet.",
        tone: "pending",
      };
    case "funded":
      if (state.campaign?.leaderboardEligible === true) {
        return {
          title: "Campaign funded",
          body: "Your ad is funded and eligible for the public leaderboard.",
          tone: "success",
        };
      }
      if (state.campaign?.publicOnLeaderboard === false) {
        return {
          title: "Campaign funded",
          body: "Your ad is funded, but it is not on the public leaderboard because public listing is turned off.",
          tone: "success",
        };
      }
      return {
        title: "Campaign funded",
        body: "Your ad is funded, but it is not currently biddable for the public leaderboard.",
        tone: "success",
      };
    case "error":
      return {
        title: "Could not check checkout status",
        body: "SpinShare could not verify this checkout session from the homepage. Open the advertiser dashboard or try refreshing.",
        tone: "error",
      };
  }
}

export function shouldPollCheckoutStatus(
  state: CheckoutStatusViewState,
  attempts: number,
): boolean {
  if (attempts >= CHECKOUT_STATUS_MAX_POLLS) {
    return false;
  }
  return state.kind === "pending_webhook" || state.kind === "unknown";
}

export function shouldNotifyMarketRefresh(
  previousState: CheckoutStatusViewState,
  nextState: CheckoutStatusViewState,
): boolean {
  return previousState.kind !== "funded" && nextState.kind === "funded";
}

function stateFromApiBody(
  sessionId: string,
  body: CheckoutStatusApiResponse,
): CheckoutStatusViewState {
  if (body.status === "funded") {
    return {
      kind: "funded",
      sessionId,
      campaign: body.campaign,
    };
  }

  if (body.status === "pending_webhook") {
    return {
      kind: "pending_webhook",
      sessionId,
      campaign: body.campaign,
    };
  }

  return {
    kind: "unknown",
    sessionId,
  };
}

function toneClasses(tone: CheckoutStatusCopy["tone"]): string {
  switch (tone) {
    case "success":
      return "border-emerald-300/70 bg-emerald-50/80 text-emerald-950";
    case "pending":
      return "border-sky-300/70 bg-sky-50/80 text-sky-950";
    case "warning":
      return "border-amber-300/70 bg-amber-50/85 text-amber-950";
    case "error":
      return "border-red-300/70 bg-red-50/85 text-red-950";
  }
}

function StatusIcon({ tone }: { tone: CheckoutStatusCopy["tone"] }) {
  const className = "h-5 w-5";
  if (tone === "success") return <CheckCircle2 className={className} aria-hidden />;
  if (tone === "pending") return <Clock3 className={className} aria-hidden />;
  if (tone === "warning") return <AlertTriangle className={className} aria-hidden />;
  return <XCircle className={className} aria-hidden />;
}

function dispatchCheckoutFundedMarketRefresh(state: CheckoutStatusViewState): void {
  if (state.kind !== "funded") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CHECKOUT_FUNDED_MARKET_REFRESH_EVENT, {
      detail: {
        sessionId: state.sessionId,
        campaignId: state.campaign?.id,
      },
    }),
  );
}

export default function CheckoutStatusBanner() {
  const [state, setState] = useState<CheckoutStatusViewState>({ kind: "hidden" });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    const checkoutReturn = readCheckoutReturn(window.location.search);

    if (checkoutReturn.kind === "none") {
      setState({ kind: "hidden" });
      return () => {
        cancelled = true;
      };
    }

    if (checkoutReturn.kind === "cancelled") {
      setState({ kind: "cancelled" });
      return () => {
        cancelled = true;
      };
    }

    if (!isCheckoutSessionId(checkoutReturn.sessionId)) {
      setState({
        kind: "error",
        sessionId: checkoutReturn.sessionId ?? undefined,
      });
      return () => {
        cancelled = true;
      };
    }

    const sessionId = checkoutReturn.sessionId;
    let currentState: CheckoutStatusViewState = { kind: "loading", sessionId };
    setState(currentState);

    function scheduleNext(nextState: CheckoutStatusViewState, attempts: number): void {
      if (!shouldPollCheckoutStatus(nextState, attempts)) {
        return;
      }
      timeoutId = window.setTimeout(() => {
        void loadStatus(attempts + 1);
      }, CHECKOUT_STATUS_POLL_MS);
    }

    async function loadStatus(attempts = 0) {
      try {
        const response = await fetch(
          `/api/checkout-status?checkout_session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );
        const body = (await response.json().catch(() => null)) as
          | CheckoutStatusApiResponse
          | null;

        if (cancelled) return;

        if (
          body !== null &&
          body.sessionId === sessionId &&
          (body.status === "unknown" ||
            body.status === "pending_webhook" ||
            body.status === "funded")
        ) {
          const nextState = stateFromApiBody(sessionId, body);
          if (shouldNotifyMarketRefresh(currentState, nextState)) {
            dispatchCheckoutFundedMarketRefresh(nextState);
          }
          currentState = nextState;
          setState(nextState);
          scheduleNext(nextState, attempts);
          return;
        }

        if (response.status === 404) {
          const nextState: CheckoutStatusViewState = { kind: "unknown", sessionId };
          currentState = nextState;
          setState(nextState);
          scheduleNext(nextState, attempts);
          return;
        }

        setState({ kind: "error", sessionId });
      } catch {
        if (!cancelled) {
          setState({ kind: "error", sessionId });
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  if (state.kind === "hidden") {
    return null;
  }

  const copy = checkoutStatusCopy(state);
  const budget =
    "campaign" in state && state.campaign !== undefined
      ? formatUsd(state.campaign.budgetCents)
      : null;

  return (
    <section
      id="checkout-status"
      aria-label="Checkout status"
      role={copy.tone === "error" ? "alert" : "status"}
      className={`mt-8 rounded-[18px] border px-5 py-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] ${toneClasses(copy.tone)}`}
    >
      <div className="flex gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/75">
          <StatusIcon tone={copy.tone} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black">{copy.title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 opacity-85">{copy.body}</p>
          {budget !== null && (
            <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] opacity-70">
              Campaign budget {budget}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
