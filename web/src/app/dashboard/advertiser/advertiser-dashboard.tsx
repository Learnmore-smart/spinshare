"use client";

/**
 * Advertiser dashboard shell (task 12.4).
 *
 * Client orchestrator that owns the campaign list state and wires together the
 * {@link CampaignBuilder} and {@link CampaignList}. On mount it loads the
 * advertiser's campaigns from `GET /api/campaigns` using the bearer
 * `Device_Auth_Token` minted server-side for the session, rendering explicit
 * loading, error (with retry), and ready states. Newly created campaigns are
 * prepended so they appear immediately without a refetch.
 */

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { CampaignBuilder } from "./campaign-builder";
import { CampaignList } from "./campaign-list";
import type { CampaignView } from "./lib";

/** Props for {@link AdvertiserDashboard}. */
export interface AdvertiserDashboardProps {
  /** Bearer `Device_Auth_Token` for the authenticated advertiser. */
  token: string;
}

/** Load lifecycle of the campaign list. */
type LoadState =
  | { status: "loading" }
  | { status: "ready"; campaigns: CampaignView[] }
  | { status: "error"; message: string };

export function AdvertiserDashboard({ token }: AdvertiserDashboardProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const loadCampaigns = useCallback(async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/campaigns", {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        setState({
          status: "error",
          message: `Could not load your campaigns (error ${response.status}).`,
        });
        return;
      }
      const body = (await response.json()) as { campaigns: CampaignView[] };
      setState({ status: "ready", campaigns: body.campaigns });
    } catch {
      setState({
        status: "error",
        message:
          "Could not reach the server. Check your connection and try again.",
      });
    }
  }, [token]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const handleCreated = useCallback(
    (created: CampaignView): void => {
      setState((prev) => {
        if (prev.status === "ready") {
          return { status: "ready", campaigns: [created, ...prev.campaigns] };
        }
        // List wasn't loaded (loading/error): pull a fresh copy.
        void loadCampaigns();
        return prev;
      });
    },
    [loadCampaigns],
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-primary [text-shadow:0_0_18px_hsl(var(--neon)/0.6)]">
          Advertiser dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Create campaigns, fund their budgets, and reach developers inside their
          tools.
        </p>
      </header>

      <CampaignBuilder token={token} onCreated={handleCreated} />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-foreground">Your campaigns</h2>

        {state.status === "loading" && (
          <Card data-testid="campaigns-loading">
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">
                Loading campaigns…
              </CardTitle>
            </CardHeader>
          </Card>
        )}

        {state.status === "error" && (
          <Card data-testid="campaigns-error">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Something went wrong
              </CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void loadCampaigns();
                }}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {state.status === "ready" && (
          <CampaignList token={token} campaigns={state.campaigns} />
        )}
      </section>
    </main>
  );
}
