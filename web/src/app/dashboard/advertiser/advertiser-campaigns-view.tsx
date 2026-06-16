"use client";

import { useT } from "@/lib/i18n/locale-provider";
import { useAdvertiserDashboard } from "./advertiser-dashboard-context";
import { CampaignBuilder } from "./campaign-builder";
import { CampaignList } from "./campaign-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AdvertiserCampaignsView() {
  const t = useT();
  const { token, campaignsState, loadCampaigns, handleCreated } = useAdvertiserDashboard();

  return (
    <div className="adv-dash-grid adv-dash-rise">
      <CampaignBuilder token={token} onCreated={handleCreated} />

      <section className="flex flex-col gap-4">
        <h2 className="adv-dash-section-heading">{t.advertiserDashboard.yourCampaigns}</h2>

        {campaignsState.status === "loading" && (
          <Card data-testid="campaigns-loading">
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">
                {t.advertiserDashboard.loadingCampaigns}
              </CardTitle>
            </CardHeader>
          </Card>
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
    </div>
  );
}
