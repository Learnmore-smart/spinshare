"use client";

import { useEffect } from "react";

import { useT } from "@/lib/i18n/locale-provider";
import { useAdvertiserDashboard } from "./advertiser-dashboard-context";
import { CampaignList } from "./campaign-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function CampaignCardSkeleton() {
  return (
    <div className="adv-dash-campaign-card adv-skeleton-pulse" aria-hidden>
      <div className="adv-dash-campaign-main">
        {/* header: ad text + status badge */}
        <div className="adv-dash-campaign-head">
          <div className="min-w-0 flex-1 flex flex-col gap-2">
            <div className="h-4 w-2/3 adv-skeleton-block" />
            <div className="flex gap-2">
              <div className="h-5 w-24 adv-skeleton-block rounded-full" />
              <div className="h-5 w-20 adv-skeleton-block rounded-full" />
            </div>
          </div>
          <div className="h-5 w-16 adv-skeleton-block rounded-full shrink-0" />
        </div>

        {/* delivery progress */}
        <div className="adv-dash-campaign-delivery">
          <div className="adv-dash-campaign-delivery-head">
            <div className="h-3.5 w-24 adv-skeleton-block" />
            <div className="h-3.5 w-16 adv-skeleton-block" />
          </div>
          <div className="adv-dash-campaign-progress-track">
            <div className="adv-dash-campaign-progress-fill" style={{ width: "40%" }} />
          </div>
        </div>

        {/* telemetry cards row */}
        <div className="adv-dash-campaign-telemetry">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="adv-telemetry-card flex flex-col gap-1.5">
              <div className="h-3 w-14 adv-skeleton-block" />
              <div className="h-5 w-10 adv-skeleton-block" />
            </div>
          ))}
        </div>

        {/* diagnostics tags */}
        <div className="adv-dash-campaign-diagnostics">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-5 w-20 adv-skeleton-block rounded-full" />
          ))}
        </div>
      </div>

      {/* funds section */}
      <div className="adv-dash-campaign-funds flex flex-col gap-2">
        <div className="h-4 w-28 adv-skeleton-block" />
        <div className="flex gap-2">
          <div className="h-10 flex-1 adv-skeleton-block rounded-md" />
          <div className="h-10 w-32 adv-skeleton-block rounded-md" />
        </div>
        <div className="h-3 w-48 adv-skeleton-block" />
      </div>
    </div>
  );
}

export function AdvertiserCampaignsView() {
  const t = useT();
  const { token, campaignsState, loadCampaigns } = useAdvertiserDashboard();

  // When the advertiser arrives here from a "Resume payment" action in the
  // activity feed (`?fund=<campaignId>`), bring that campaign's funding control
  // into view and focus it so they can finish funding immediately.
  useEffect(() => {
    if (campaignsState.status !== "ready") {
      return;
    }
    const fundId = new URLSearchParams(window.location.search).get("fund");
    if (fundId === null || fundId.length === 0) {
      return;
    }
    const input = document.getElementById(`funds-${fundId}`);
    if (input === null) {
      return;
    }
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    if (input instanceof HTMLInputElement) {
      input.focus({ preventScroll: true });
    }
    const card = input.closest(".adv-camp-card");
    if (card !== null) {
      card.classList.add("adv-camp-card--resume");
      window.setTimeout(
        () => card.classList.remove("adv-camp-card--resume"),
        2400,
      );
    }
  }, [campaignsState.status]);

  return (
    <section className="adv-dash-rise flex flex-col gap-4">
      <h2 className="adv-dash-section-heading">{t.advertiserDashboard.yourCampaigns}</h2>

      {campaignsState.status === "loading" && (
        <div data-testid="campaigns-loading" aria-busy="true">
          <span className="sr-only">{t.advertiserDashboard.loadingCampaigns}</span>
          <ul className="adv-camp-grid">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="adv-camp-grid-item"><CampaignCardSkeleton /></li>
            ))}
          </ul>
        </div>
      )}

      {campaignsState.status === "error" && (
        <Card data-testid="campaigns-error">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              {t.advertiserDashboard.somethingWrong}
            </CardTitle>
            <CardDescription>{campaignsState.message}</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void loadCampaigns();
              }}
            >
              {t.advertiserDashboard.retry}
            </Button>
          </div>
        </Card>
      )}

      {campaignsState.status === "ready" && (
        <CampaignList token={token} campaigns={campaignsState.campaigns} />
      )}
    </section>
  );
}
