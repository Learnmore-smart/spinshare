/**
 * Presentational developer dashboard (Requirements 8.1–8.3).
 *
 * Pure, data-driven view: it receives a {@link DeveloperDashboardSummary}
 * (produced by `summarizeLedger`) and renders the KPI cards, the
 * earnings-over-time chart, and the activity ledger table — with an explicit
 * empty state when there are no earnings yet. It performs no data fetching and
 * no auth, so the dashboard property test (task 12.5 / Property 25) can render
 * it directly from ledger fixtures.
 *
 * The companion {@link DeveloperDashboardError} renders the explicit error state
 * the page falls back to when the ledger cannot be loaded (design "Error
 * Handling": dashboards render an explicit error state, never crash).
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EarningsChart } from "./earnings-chart";
import type { DeveloperDashboardSummary } from "./summarize-ledger";

/** Props for {@link DeveloperDashboardView}. */
export interface DeveloperDashboardViewProps {
  /** The pure view-model derived from the developer's ledger entries. */
  summary: DeveloperDashboardSummary;
}

/** Shared page shell: heading + content. */
function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-primary [text-shadow:0_0_12px_hsl(var(--neon)/0.5)]">
          Developer Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Your earnings while your AI was thinking.
        </p>
      </header>
      {children}
    </main>
  );
}

/**
 * The developer dashboard. Renders KPI cards (total earnings), the
 * earnings-over-time chart, and the activity ledger table. When there are no
 * recorded impressions it shows an explicit empty state instead of the chart
 * and table.
 */
export function DeveloperDashboardView({
  summary,
}: DeveloperDashboardViewProps) {
  const { totalEarningsUsd, impressionCount, series, rows } = summary;
  const isEmpty = impressionCount === 0;

  return (
    <DashboardShell>
      {/* KPI cards (Requirement 8.1) */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        data-testid="kpi-cards"
      >
        <Card>
          <CardHeader>
            <CardDescription>Total earnings</CardDescription>
            <CardTitle
              className="text-primary"
              data-testid="kpi-total-earnings"
            >
              ${totalEarningsUsd}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Impressions</CardDescription>
            <CardTitle data-testid="kpi-impressions">
              {impressionCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      {isEmpty ? (
        <Card data-testid="empty-state">
          <CardHeader>
            <CardTitle className="text-lg">No earnings yet</CardTitle>
            <CardDescription>
              Run the SpinShare CLI or install the extension to start earning
              while your AI generates.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* Earnings over time (Requirement 8.2) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Earnings over time</CardTitle>
              <CardDescription>
                Cumulative earnings across recorded impressions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EarningsChart series={series} />
            </CardContent>
          </Card>

          {/* Activity ledger (Requirement 8.3) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity</CardTitle>
              <CardDescription>
                Recorded impressions and the amount credited for each.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <table
                className="w-full border-collapse text-left text-sm"
                data-testid="activity-table"
              >
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">#</th>
                    <th className="py-2 pr-4 font-medium">Campaign</th>
                    <th className="py-2 pl-4 text-right font-medium">
                      Credited
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.entryId}
                      className="border-b border-border/50"
                      data-testid="activity-row"
                    >
                      <td className="py-2 pr-4 text-muted-foreground">
                        {row.sequence}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {row.campaignId}
                      </td>
                      <td
                        className="py-2 pl-4 text-right text-primary"
                        data-testid="activity-credit"
                      >
                        ${row.developerCreditUsd}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}

/** Props for {@link DeveloperDashboardError}. */
export interface DeveloperDashboardErrorProps {
  /** Optional human-readable detail about what failed. */
  message?: string;
}

/**
 * Explicit error state shown when the developer's ledger cannot be loaded.
 * Renders a card rather than crashing the route (design "Error Handling").
 */
export function DeveloperDashboardError({
  message,
}: DeveloperDashboardErrorProps) {
  return (
    <DashboardShell>
      <Card data-testid="error-state">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">
            Couldn&apos;t load your dashboard
          </CardTitle>
          <CardDescription>
            {message ??
              "Something went wrong loading your earnings. Please try again."}
          </CardDescription>
        </CardHeader>
      </Card>
    </DashboardShell>
  );
}
