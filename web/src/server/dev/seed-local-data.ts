/**
 * Local data seeder.
 *
 * Provisions durable records for the {@link LOCAL_TEST_USERS} so that, in local
 * mode, signing in with a test account immediately shows real data:
 *   - the developer dashboard renders earnings, a chart, and activity rows from
 *     seeded {@link LedgerEntry} records, and
 *   - the advertiser dashboard (and homepage market panel) shows a funded,
 *     active campaign.
 *
 * It is wired into the composition root's in-memory branch (`container.ts`) and
 * runs once per process at first container build. It operates only on the
 * synchronous in-memory repositories, never against Firestore/production, and
 * is idempotent (stable ids / `entryId`s), so a re-run never double-counts.
 */

import type { Campaign, LedgerEntry, User } from "@spinshare/core";

import type {
  MemoryCampaignRepository,
  MemoryLedgerRepository,
  MemoryUserRepository,
} from "../adapters/memory";
import { LOCAL_TEST_USERS } from "./test-users";

/** The in-memory repositories the seeder writes to. */
export interface SeedableRepos {
  users: MemoryUserRepository;
  campaigns: MemoryCampaignRepository;
  ledger: MemoryLedgerRepository;
}

/** Stable campaign id for the seeded advertiser campaign. */
const DEMO_CAMPAIGN_ID = "cmp-local-demo";
/** Number of impressions credited to the seeded developer. */
const SEEDED_IMPRESSIONS = 24;

/**
 * Illustrative, self-consistent per-impression split (matches the e2e
 * settlement example): 30¢ revenue → 18¢ developer credit, 12¢ retention.
 * Sub-cent fields are micro-cents (1 cent = 1000 micro-cents).
 */
const REVENUE_MICROCENTS = 30_000;
const DEVELOPER_CREDIT_CENTS = 18;
const RETENTION_MICROCENTS = REVENUE_MICROCENTS - DEVELOPER_CREDIT_CENTS * 1000;

/** Funded budget and CPM for the seeded advertiser campaign. */
const CAMPAIGN_BUDGET_CENTS = 5_000;
const CAMPAIGN_CPM_CENTS = 3_000;

/** Resolves the seeded developer / advertiser test accounts by role. */
function accountByRole(role: User["role"]) {
  return LOCAL_TEST_USERS.find((user) => user.role === role) ?? null;
}

/**
 * Seeds durable records for the local test accounts. Safe to call once at
 * container construction in local mode; a no-op for any role that is not
 * defined in {@link LOCAL_TEST_USERS}.
 */
export function seedLocalTestData(repos: SeedableRepos): void {
  const developer = accountByRole("developer");
  const advertiser = accountByRole("advertiser");

  // --- Developer: durable user + ledger history --------------------------
  if (developer) {
    const totalEarningsCents = SEEDED_IMPRESSIONS * DEVELOPER_CREDIT_CENTS;
    const developerUser: User = {
      id: developer.id,
      email: developer.email,
      provider: developer.provider,
      role: developer.role,
      balanceCents: totalEarningsCents,
    };
    repos.users.seed(developerUser);

    const entries: LedgerEntry[] = Array.from(
      { length: SEEDED_IMPRESSIONS },
      (_, index): LedgerEntry => ({
        entryId: `seed-${developer.id}-${index + 1}`,
        campaignId: DEMO_CAMPAIGN_ID,
        developerId: developer.id,
        revenueMicrocents: REVENUE_MICROCENTS,
        developerCreditCents: DEVELOPER_CREDIT_CENTS,
        spinshareRetentionMicrocents: RETENTION_MICROCENTS,
      }),
    );
    repos.ledger.seed(entries);
  }

  // --- Advertiser: durable user + one funded, active campaign ------------
  if (advertiser) {
    const advertiserUser: User = {
      id: advertiser.id,
      email: advertiser.email,
      provider: advertiser.provider,
      role: advertiser.role,
      balanceCents: 0,
    };
    repos.users.seed(advertiserUser);

    const campaign: Campaign = {
      id: DEMO_CAMPAIGN_ID,
      advertiserId: advertiser.id,
      adText: "SpinShare Local - sample ad for localhost testing",
      destinationUrl: "https://spinshare-web-vert.vercel.app",
      brandName: "SpinShare Local",
      cpmCents: CAMPAIGN_CPM_CENTS,
      budgetCents: CAMPAIGN_BUDGET_CENTS,
      status: "active",
      createdAtMs: 0,
    };
    repos.campaigns.seed(campaign);
  }
}
