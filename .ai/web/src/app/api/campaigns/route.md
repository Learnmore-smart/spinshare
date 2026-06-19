# route.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Authenticated advertiser campaign management API.

## Planned Change

Enrich `GET /api/campaigns` responses with aggregate campaign telemetry for the
advertiser dashboard:

- shows
- clicks
- credited impressions
- non-credit reason buckets

Every campaign should receive a zero-filled telemetry object when it has no
activity.

## Planned Change 2026-06-15

Support email-first advertiser claim: when the authenticated token includes an email, `GET /api/campaigns` should include campaigns owned by the deterministic public advertiser id for that email in addition to campaigns owned directly by `claims.userId`.

## Implemented Change 2026-06-15

`GET /api/campaigns` now resolves full auth claims. When the token includes an email, it also lists campaigns owned by `publicAdvertiserIdForEmail(email)`, de-duplicates by campaign id, and returns the same telemetry-enriched view.

## Constraints

- Only return campaigns owned by the authenticated advertiser.
- Telemetry must remain aggregate and campaign-scoped.
- Do not expose prompts, user content, or private user identifiers.
- Campaign creation must inherit core ad-safety validation before mutation.
- Campaign edits must use the same ownership boundary as reads: direct user id
  plus the deterministic public advertiser id for the caller's email.
- Editing ad text or destination URL must re-run the content review seam before
  the campaign can bid again.

## Planned Change 2026-06-18 Campaign Edit Endpoint

Add `PATCH /api/campaigns` so advertisers can inspect and correct ad details
before buying or resubmitting:

- require a bearer advertiser token
- require `campaignId`
- reject missing campaigns and campaigns not owned by the caller
- validate editable fields with the core update schema
- support ad text, destination URL, brand name, icon, leaderboard visibility,
  and CPM edits
- re-run review for ad text or destination changes and persist the result
- return the updated campaign view

## Implemented Change 2026-06-18 Campaign Edit Endpoint

`PATCH /api/campaigns` authenticates the advertiser, validates editable fields
with `updateCampaignSchema`, enforces direct/same-email ownership, re-runs the
review seam for text or destination edits, persists the patch through
`CampaignRepository.update()`, and returns the updated campaign view.

## Planned Change 2026-06-18 Delete Unpaid Campaign

Add `DELETE /api/campaigns` for advertiser-owned, zero-budget campaigns. The
route should authenticate the caller, require `campaignId`, enforce the same
direct/same-email ownership boundary as edit, reject campaigns with remaining
budget, and remove the row through the campaign repository.

## Implemented Change 2026-06-18 Delete Unpaid Campaign

`DELETE /api/campaigns` now authenticates the advertiser, validates
`campaignId`, enforces the same ownership boundary as edits, rejects campaigns
with budget or activity, deletes eligible campaigns through the repository, and
returns `{ deleted: true, campaignId }`.

## Bug Fix 2026-06-18 Delete HMR Compatibility

**Symptom:** In Next.js development, `DELETE /api/campaigns` can crash with
`TypeError: campaigns.delete is not a function` even after the source repository
adapters implement `delete()`.

**Root Cause:** `getContainer()` caches a process-wide container on
`globalThis` during development so it survives HMR. If that singleton was built
before the repository port gained `delete()`, the live repository instance keeps
the old prototype and the route calls a missing method.

**Fix Strategy:** Route deletion through a small adapter-compatible helper that
uses `repo.delete(id)` when present, and falls back to the legacy memory or
Firestore adapter shape when the dev singleton is stale. Keep all ownership,
budget, and activity checks in the route before deletion.

**Regression Risk:** The fallback should only run after authorization and
unpaid checks, and only for known repository shapes.

## Implemented Fix 2026-06-18 Delete HMR Compatibility

Added `deleteCampaignRecord()`, which uses `CampaignRepository.delete()` when
available and falls back to legacy memory-map or Firestore collection deletion
when the development singleton was created before the `delete()` method existed.
The route still performs ownership, budget, and activity checks before calling
the helper.

## Verification 2026-06-18 Delete HMR Compatibility

- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts` passed.

## Planned Change 2026-06-16 Ad Safety Gate

Authenticated campaign creation should use the shared core deterministic
ad-text safety gate. Unsafe/deceptive ad copy returns the existing `400`
validation response and creates no campaign.

## Implemented Change 2026-06-16 Ad Safety Gate

Authenticated campaign creation now inherits the shared core ad-text safety
gate. Unsafe copy returns `400` and no campaign is stored.

Verification passed after rebuilding core:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/advertiser-checkout/route.test.ts src/app/api/campaigns/route.test.ts`.

## Planned Change 2026-06-16 Advertiser Read-Time Flush

Root cause: `POST /api/track` records credited impressions through the hot
counter store first, then a flush cycle reconciles pending entries into the
durable ledger/user/campaign repositories. The developer dashboard and payout
status already trigger `flushPendingForRead`, but `GET /api/campaigns` still
reads campaign budget and durable impression counts without flushing. That can
make an advertiser pay, receive impressions, and then briefly see stale
remaining budget / served counts in the advertiser dashboard.

Fix plan: call `flushPendingForRead(container, "advertiser-campaigns")` in
`GET /api/campaigns` after authentication and before listing owned campaigns or
reading telemetry/ledger counts. The helper is best-effort and logs instead of
throwing, so dashboard reads still return if reconciliation is temporarily
unavailable.

Regression risk: this adds one reconciliation attempt to each advertiser
campaign read. It should only use the existing flush helper and must not change
campaign creation or unauthenticated responses.

## Implemented Change 2026-06-16 Advertiser Read-Time Flush

`GET /api/campaigns` now calls
`flushPendingForRead(container, "advertiser-campaigns")` after successful
authentication and before listing campaigns / reading telemetry / counting
durable impressions. The helper remains best-effort, so a failed reconciliation
logs but does not block the dashboard response.

RED verification before implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
failed because `cmp_pending` returned `budgetCents: 5000` and `credited: 0`
instead of the flushed `4997` / `1`.

GREEN verification after implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
passed 5 tests.

## Planned Change 2026-06-16 Dashboard Checkout Reconciliation

Root cause: real Stripe local tests depend on either `/api/webhooks/stripe` or
the homepage `/api/checkout-status` banner to apply paid Checkout Session
funding. If the webhook is not forwarded and the user later opens the
advertiser dashboard, `GET /api/campaigns` currently sees only the
`checkoutStarted` activity plus a zero-budget campaign. That keeps the paid ad
out of the market/ranking and out of the extension ad feed even though Stripe
has marked the session as paid.

Fix plan: after resolving owned campaigns, call a shared checkout
reconciliation helper for those campaign ids. The helper should inspect owned
`checkoutStarted` activity rows, retrieve provider-verified funding state by
session id, and apply the budget exactly once through the existing
`paymentEvents` idempotency gate. If reconciliation applies funding, refresh
the owned campaign list before building the dashboard response.

Regression risk: dashboard reads may call Stripe for pending checkouts owned by
the logged-in advertiser. Keep it bounded to owned campaigns and do not let
provider lookup failures block campaign listing.

## Implemented Change 2026-06-16 Dashboard Checkout Reconciliation

`GET /api/campaigns` now calls
`reconcilePaidCheckoutSessionsForCampaigns(container, uniqueOwned)` after
listing owned campaigns and before building the response. When reconciliation
may have applied funding, it refreshes the owned campaign list so `budgetCents`
and `remainingBudgetUsd` reflect the paid Checkout Session immediately.

RED verification before implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
failed because the claimed public campaign returned `budgetCents: 0` after a
paid provider lookup.

GREEN verification after implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
passed 6 tests.

## Planned Change 2026-06-17 Direct Checkout On Campaign Create

Root cause: the authenticated dashboard campaign creation endpoint only creates
a zero-budget campaign. The dashboard then clears the builder and asks the user
to purchase impressions in a separate campaign-card control. The expected flow
is a single action: Create campaign should create the campaign and immediately
open Stripe Checkout for the selected impression blocks.

Fix plan:

- Accept an optional `blockCount` on `POST /api/campaigns`.
- Preserve existing behavior when `blockCount` is omitted.
- When present, derive the checkout amount from the newly created campaign's
  stored CPM and the requested block count.
- Create a Stripe Checkout Session through the existing payment gateway.
- Return the checkout URL/session alongside the created campaign.
- Use dashboard return URLs so success/cancel lands back on
  `/dashboard/advertiser`; cancel must leave the campaign and form values
  recoverable for a retry.
- Record `checkoutStarted` and settled mock `budgetFunded` activity rows using
  the same activity shape as `/api/funds/checkout`.

Regression risk: this adds payment creation to the authenticated create route
only when `blockCount` is included. Keep authorization, validation, and legacy
201 campaign response behavior intact for older callers.

## Implemented Change 2026-06-17 Direct Checkout On Campaign Create

`POST /api/campaigns` now accepts optional `blockCount`. Without it, the route
still returns the legacy campaign view. With it, the route validates the derived
checkout total before campaign creation, creates the campaign, starts a Checkout
Session, records `checkoutStarted`, applies settled mock funding when indicated,
records `budgetFunded`, and returns `{ url, sessionId, amountCents, amountUsd,
campaign }` with status `201`.

RED verification before implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-builder.test.tsx`
failed because `sessionId` was undefined for create-with-blockCount.

GREEN verification after implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-builder.test.tsx`
passed 9 tests after rebuilding `@spinshare/core`.

## Implemented Change

`GET /api/campaigns` now returns zero-filled telemetry for each owned campaign,
merging durable ledger impression counts into the `credited` total.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts src/server/bidding-service.test.ts` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented HMR-compatible delete fallback for stale campaign repositories. | Codex |
| 2026-06-18 | Planned HMR-compatible delete fallback for stale campaign repositories. | Codex |
| 2026-06-18 | Implemented authenticated deletion for owned unpaid campaigns. | Codex |
| 2026-06-18 | Planned authenticated deletion for owned unpaid campaigns. | Codex |
| 2026-06-18 | Implemented campaign PATCH edit endpoint. | Codex |
| 2026-06-18 | Planned campaign PATCH edit endpoint and review rerun. | Codex |
| 2026-06-17 | Implemented optional direct checkout on authenticated campaign creation. | Codex |
| 2026-06-17 | Planned optional direct checkout on authenticated campaign creation. | Codex |
| 2026-06-16 | Implemented dashboard read-time reconciliation for paid Stripe checkout sessions. | Codex |
| 2026-06-16 | Planned dashboard read-time reconciliation for paid Stripe checkout sessions. | Codex |
| 2026-06-16 | Implemented advertiser campaign read-time flush before dashboard reads. | Codex |
| 2026-06-16 | Planned advertiser campaign read-time flush before dashboard reads. | Codex |
| 2026-06-16 | Implemented authenticated campaign ad safety gate through core schema. | Codex |
| 2026-06-16 | Planned authenticated campaign ad safety gate through core schema. | Codex |
| 2026-06-15 | Implemented email-based claim for public checkout campaigns. | Codex |
| 2026-06-15 | Planned email-based claim for public homepage purchases. | Codex |
| 2026-06-15 | Planned advertiser campaign telemetry response fields. | Codex |
| 2026-06-15 | Implemented advertiser campaign telemetry enrichment. | Codex |
