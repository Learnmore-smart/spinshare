# SpinShare 项目状态报告

> 生成于 2026-06-15。本文是单一事实来源，整合了架构说明、后端诊断、问题清单和改进方向。
> 所有结论基于代码事实，关键处附文件/行号。

---

## 2026-06-17 Payout Connect `identity.country` and error display fix

Root cause:

- A real `POST /api/payouts/connect` failed with Stripe request
  `req_v2qEFpphvh4k0ngvw`, HTTP 400, provider code
  `identity_country_required`.
- This was a request-shape bug, not a Stripe Dashboard mystery: the Accounts v2
  recipient account create payload omitted `identity.country`. The existing v1
  fallback already used `country: "US"`, and the app's payout model is currently
  USD/US-scoped.
- The dashboard also discarded sanitized non-2xx API JSON, so users saw only
  the generic localized retry message even when the API returned a Stripe
  request id or provider code.

Implemented fix:

- `web/src/server/adapters/stripe/stripe-payout-gateway.ts` now sends
  `identity: { country: "us" }` in the Accounts v2 recipient create payload.
- `POST /api/payouts/connect` now maps known Stripe Connect platform setup
  blockers (`platform_registration_required`, `account_create_activation_required`,
  `connect_profile_not_submitted`, `connect_identity_not_verified`, and the
  signed-up-for-Connect message) to a non-secret
  `reason: "stripe_connect_not_enabled"` response while preserving request
  id/status/code.
- `PayoutPanel` now parses sanitized payout failure JSON for connect and
  withdraw actions, displays localized Connect-not-enabled copy when available,
  and appends the Stripe request id for log lookup.

Verification:

- RED/GREEN Accounts v2 payload test caught the missing identity country, then
  passed after the fix.
- Focused payout verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/stripe/stripe-payout-gateway.test.ts src/app/api/payouts/connect/route.test.ts src/app/dashboard/developer/payout-panel.test.ts`
  with 3 files / 11 tests.

Remaining caveat:

- Retry payout onboarding after the dev server picks up this change. If Stripe
  then returns one of the Connect platform setup blocker codes above, the next
  required action is enabling/completing Stripe Connect in Stripe Dashboard; that
  is distinct from the now-fixed missing `identity.country` request bug.

---

## 2026-06-17 Fix — earnings never reach ledger/dashboard + local/prod credential mixing

This builds on the diagnosis below. Two distinct bugs were found and fixed.

### Bug A — credited impressions never reconcile into the durable ledger (dashboard shows $0 while activity shows credits)

**Live evidence (read-only queries against project `spinshare-5e6cf`):**

- Production RTDB `spinshare/hot/pending/ledger` held **un-flushed credited
  entries** for the developer (`developerCreditCents: 2` each, campaign
  `cmp-learnx-demo`); `spinshare/hot/bal/<dev>` = `24`; `inflight` = `null`.
- Production Firestore `ledgerEntries` = **0 docs**; `users` = **0 docs**.
- The `/dashboard/developer/activity` feed reads `impressionActivities`
  (written synchronously in `recordTrackActivity`,
  `web/src/app/api/track/route.ts`), so it shows credits. The overview
  (`developer-overview-view.tsx`) and earnings chart
  (`developer-earnings-view.tsx`) derive **everything** — balance KPI, today /
  month, event count, caps, chart — from
  `summarizeLedger(ledger.listByDeveloper(developerId))`
  (`web/src/app/dashboard/developer/layout.tsx:68`). With the ledger empty, all
  of those read `$0` / `0`.

**Root cause.** The hot path enqueues a ledger entry per credited impression
into RTDB; `runFlushCycle` (`web/src/server/flush-service.ts`) is meant to drain
RTDB → Firestore `ledgerEntries` and apply balance/budget deltas.
`flushPendingForRead` runs it on every developer-page load
(`web/src/app/dashboard/developer/layout.tsx:67`). But
`FirestoreUserRepo.applyBalanceDeltaCents` **throws `User <id> not found`** when
no `users/{developerId}` doc exists (`user-repo.ts:89`) — and under JWT sessions
**no durable user record is ever created** (prod `users` = 0). The throw aborts
the whole cycle → `nackDrained` returns the batch to RTDB pending → it retries
forever, error swallowed by `flush-before-read.ts`. Net effect: **no developer's
earnings ever reconcile** to the durable ledger, so every dashboard shows $0.
`applyBudgetDeltaCents` has the same throw-on-missing-campaign hazard
(`campaign-repo.ts:113`).

**Fix.**

1. `FirestoreUserRepo.applyBalanceDeltaCents` and
   `MemoryUserRepository.applyBalanceDeltaCents` now **upsert**: a missing user
   doc is created with the credited balance instead of throwing. Reconciliation
   is self-healing.
2. `runFlushCycle` now treats the per-campaign budget delta as best-effort —
   a missing campaign is skipped (logged) instead of poisoning the whole batch.
   The idempotent `appendEntries` remains the only nack/retry trigger, so the
   existing exactly-once property (Property 11) is preserved.
3. Result: on the next dashboard load the stuck RTDB entries drain into
   `ledgerEntries`, balances are created, and the overview + earnings chart +
   event count reflect the credited impressions — consistent with the activity
   feed.

### Bug B — local and production credentials/baseUrl silently mix

**Root cause.** The generated Claude Code hook
(`cli-wrapper/src/claude-code-adapter.ts`, mirrored in
`vscode-extension/src/claude-code-adapter.ts`) reads the shared
`%APPDATA%/spinshare/credentials.json` and its `credentialMatchesBaseUrl`
treated a **missing `baseUrl` as matching production**
(`https://spinshare-web-vert.vercel.app`). Combined with one shared, un-scoped credential
file, a token from one environment (or an untagged one) could be used by a hook
baked for another — so a local setup's ad activity was reported to production.

**Fix.**

1. Hook credential matching is now **strict**: the stored credential is used
   only when its `baseUrl` exactly equals the hook's baked `baseUrl`. No
   production fallback — a missing/mismatched `baseUrl` yields no token and the
   hook reports nothing (never cross-environment).
2. `FileCredentialStore`/`KeytarCredentialStore` are **baseUrl-aware**: tokens
   are tagged with their environment on save and `load()` refuses a token whose
   `baseUrl` is missing or does not match the store's configured environment.
   Untagged legacy tokens are rejected when the CLI knows the target base URL,
   forcing re-login instead of guessing local vs. production. The CLI threads
   the active `baseUrl` into every credential store so local (`cli:login:local`)
   and production (`cli:login`) cannot silently leak into each other.

### Files changed

- `web/src/server/adapters/firestore/user-repo.ts` — `applyBalanceDeltaCents`
  upserts instead of throwing on a missing user.
- `web/src/server/adapters/memory/memory-user-repository.ts` — same upsert for
  parity / local + tests.
- `web/src/server/flush-service.ts` — per-campaign budget delta is best-effort
  (skip a deleted campaign instead of nacking the whole batch).
- `web/src/server/flush-service.reconciliation.test.ts` — new regression tests.
- `cli-wrapper/src/claude-code-adapter.ts` +
  `vscode-extension/src/claude-code-adapter.ts` — strict hook credential
  matching (no production fallback).
- `cli-wrapper/src/credential-store.ts` — baseUrl-aware `FileCredentialStore` /
  `KeytarCredentialStore` (tag on save, strict verify on load, reject ambiguous
  legacy tokens when the target base URL is known).
- `cli-wrapper/src/index.ts` — threads the active `baseUrl` into every credential
  store.
- Tests updated/added: `cli-wrapper/src/credential-store.test.ts`,
  `cli-wrapper/src/claude-code-adapter.test.ts`,
  `vscode-extension/src/claude-code-adapter.test.ts`.

### Verification

- Fresh follow-up verification after strict legacy-token rejection:
  `corepack pnpm@9.12.0 test` passed with core 39 tests, web 307 passed / 1
  skipped, CLI 107 tests, and VS Code extension 67 tests; `corepack
  pnpm@9.12.0 lint` passed across core, web, CLI, and extension.
- Repackaged extension artifacts after the earnings/environment fixes:
  `spinshare-prod-0.2.0.vsix` and `spinshare-local-0.2.0.vsix` were rebuilt on
  2026-06-17, and the legacy `spinshare-0.2.0.vsix` filename was refreshed from
  the rebuilt prod artifact. Manifest inspection confirmed prod defaults to
  `https://spinshare-web-vert.vercel.app`, local defaults to `http://localhost:3000`, both
  packaged Claude adapters enforce strict baseUrl token matching, and both
  bundled CLI builds include strict credential environment checks.

- `pnpm --filter @spinshare/web test` → **307 passed, 1 skipped** (incl. the new
  `flush-service.reconciliation.test.ts` and the existing flush idempotency
  property test, unchanged).
- `pnpm --filter @spinshare/cli test` → **107 passed** (credential-store env
  scoping + strict legacy-token rejection + adapter strict-matching).
- `pnpm --filter ./vscode-extension test` → **67 passed**.
- `pnpm lint` (`tsc --noEmit` across core/web/cli/extension) → **clean**.

**Recovering the already-stuck production earnings:** no migration needed. The
fix is self-healing — the next load of `/dashboard/developer` (or `/earnings`)
runs `flushPendingForRead`, which now drains the entries stranded in
`spinshare/hot/pending/ledger`, appends them to `ledgerEntries`, and creates the
missing `users/{id}` records. The overview balance, today/month, event count,
caps, and earnings chart then reflect the credited impressions — matching the
activity feed. For a background drain independent of dashboard loads, configure
the `/api/internal/flush` cron (`SPINSHARE_FLUSH_SECRET`/`CRON_SECRET`).

---

## 2026-06-17 Diagnosis — local dashboard shows $0 after watching ads via the CLI

**Symptom.** Ads were watched locally through the CLI/extension wrapper, but the
developer earnings dashboard on `http://localhost:3000` shows `$0`, `0` events,
and no activity.

**Root cause (proven, not a code bug).** The CLI was authenticated against the
**production** deployment, so every `GET /api/ad` and `POST /api/track` call went
to `https://spinshare-web-vert.vercel.app`, not to the local server. The watched-ad events
were therefore recorded in **production** Firestore, while the localhost
dashboard reads the **local `test` namespace** — two different data stores that
never intersect.

Two facts combine here, both of which were on the suspect list:

- **CLI base-URL / backend mismatch.** The stored CLI credential
  (`%APPDATA%/spinshare/credentials.json`) carries
  `baseUrl: "https://spinshare-web-vert.vercel.app"`. `pnpm cli:login` defaults to
  production (`DEFAULT_BASE_URL` in `cli-wrapper/src/api-client.ts:67`); only
  `pnpm cli:login:local` points at `http://localhost:3000`
  (`cli-wrapper/scripts/run-local.mjs`). The ad-watching path (`runWrap` in
  `cli-wrapper/src/wrap.ts`) prints no base URL, so the production target was
  silent.
- **Firestore test/prod namespace mismatch.** Local `.env` runs
  `SPINSHARE_MODE=local` + `SPINSHARE_USE_FIRESTORE=1` +
  `SPINSHARE_FIRESTORE_NAMESPACE=test`, so the local app reads/writes
  `namespaces/test/...` (`web/src/server/adapters/firestore/collections.ts:21`).
  Production writes top-level collections (no namespace).

**Evidence (read-only Firestore query, project `spinshare-5e6cf`).**

- PROD top-level `impressionActivities`: **9 docs** — 5 attributed to the CLI
  token user `fa8e2f7e-6365-443b-ad45-10dcf4d24761` (email `noahzh52@gmail.com`),
  4 with no developer id.
- The 5 CLI-user records: **4 `credited`** (`developerCreditCents: 2`,
  `viewDurationMs` 3.9s–6.1s, campaign `cmp-learnx-demo`) + 1 `tooShort`
  (2295ms). So the exposure→credit pipeline works end to end.
- PROD top-level `ledgerEntries`: 0 docs — credited money sits in the production
  **RTDB hot path** and is only flushed to Firestore on a production dashboard
  read (`flushPendingForRead` in `web/src/app/dashboard/developer/layout.tsx:67`).
  This is expected, not a second bug.
- LOCAL `namespaces/test/{impressionActivities,ledgerEntries,campaigns,users}`:
  **0 docs each.** The store the localhost dashboard reads is completely empty —
  hence `$0`, 0 events, no activity.

**Why both earnings AND activity are empty.** The dashboard layout reads earnings
from `ledger.listByDeveloper(session.user.id)` and the activity feed via a token
minted for `session.user.id` (`web/src/app/dashboard/developer/layout.tsx:52-68`,
`web/src/app/api/activity/developer/route.ts:88`). Both read the local `test`
namespace, which holds nothing for any user. The watched events live in prod
under a prod identity, so neither read returns anything.

**Ruled out:** in-memory wipe (local is on cloud Firestore via
`SPINSHARE_USE_FIRESTORE=1`), exposure-not-qualifying (4 impressions credited in
prod), and demo-data interference (`cmp-learnx-demo` is a real seeded campaign,
and local-mode seeding is off — `web/src/server/container.ts:332`).

**Minimal fix (operational — the pipeline code is correct).** Point the CLI at
the local server and provide a funded local campaign so `/api/ad` can serve one:

1. Start the local server: `pnpm dev` (reads `.env`: local mode, namespace `test`).
2. Seed a funded campaign into the local `test` namespace:
   `node web/scripts/seed-learnx-campaign.mjs` (writes
   `namespaces/test/campaigns/cmp-learnx-demo`). Required because the `test`
   namespace currently has 0 campaigns.
3. Re-authenticate the CLI against localhost, signed in as the **same identity**
   used on the localhost dashboard: `pnpm cli:login:local`. For local credential
   sign-in use `developer@spinshare.test` / `spinshare` (user id `local-developer`,
   `web/src/server/dev/test-users.ts`); the device-approval identity must match
   the dashboard session (`web/src/app/api/auth/device/approve/route.ts:38`).
4. Watch ads locally: `pnpm cli:test:local` (wraps `fake-ai.js`, reports to
   `localhost:3000`). Keep a spinner wait ≥ 3s so the impression settles.
5. Open `http://localhost:3000/dashboard/developer` signed in as the same
   `developer@spinshare.test` account → earnings + activity now appear.

**Verification.**

- Read-only Firestore diagnostic confirmed the prod-vs-local split above
  (temporary script, removed after use).
- `pnpm smoke:local-cli` already exercises the full local CLI→ad→track→render
  loop against `http://127.0.0.1:3000` (`web/scripts/smoke-local-cli.mjs`) and is
  the automated regression for this flow.

**Optional guardrail (not yet applied).** `runWrap` could print the resolved
SpinShare API base URL once (as `runLogin` does, `cli-wrapper/src/login.ts:125`)
so a production target is never silent during local testing.

---

## 2026-06-17 Verification Update

Fresh runtime verification was run against the current workspace.

Local development status:

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- scripts/dev-local-sample.test.mjs scripts/verify-local-runtime.test.mjs scripts/verify-prod-env.test.mjs`
  passed: 3 files / 23 tests.
- `corepack pnpm@9.12.0 --filter ./vscode-extension test -- scripts/package-variant.test.mjs`
  passed: 1 file / 4 tests.
- `corepack pnpm@9.12.0 --filter ./vscode-extension package:all` succeeded and
  regenerated both VSIX variants.
- The generated VSIX manifests were inspected after extraction:
  - `spinshare-prod-0.2.0.vsix` -> `SpinShare` ->
    `https://spinshare-web-vert.vercel.app`;
  - `spinshare-local-0.2.0.vsix` -> `SpinShare Local` ->
    `http://localhost:3000`.
- `corepack pnpm@9.12.0 verify:local-runtime` passed locally:
  Node 22.16.0, `claude`, `stripe`, `firebase`, and `npx` were all found.
- Current local `.env` pairs real Stripe test mode with
  `SPINSHARE_FIRESTORE_NAMESPACE=test`, so local Stripe tests are namespace
  isolated instead of using the default production Firestore/RTDB paths.

Production preflight status:

- A first sandboxed `corepack pnpm@9.12.0 verify:prod-env` failed on external
  Firebase/Stripe/OAuth checks because outbound network access was blocked.
- The same command was rerun with external network permission. Firebase
  Firestore, Firebase RTDB, Stripe balance retrieval, GitHub OAuth validation,
  and Google OAuth validation all responded.
- The remaining real production gate failure is configuration, not provider
  reachability:
  - `SPINSHARE_MODE` is not `production`;
  - neither `SPINSHARE_FLUSH_SECRET` nor `CRON_SECRET` is set.

Practical result: localhost/test separation is now backed by scripts and tests.
The current repo is not ready to claim production preflight green until a
production env file sets `SPINSHARE_MODE=production` and a flush/cron secret.

Local sample smoke update:

- A real `corepack pnpm@9.12.0 dev:sample` smoke initially exposed a bug:
  `/api/health` returned ok, but `/api/market` hit external Google Firestore and
  failed after ~42 seconds because the launcher inherited
  `SPINSHARE_USE_FIRESTORE=1` from `.env`.
- `web/scripts/dev-local-sample.mjs` now forces sample dev back to memory-only by
  setting `SPINSHARE_USE_FIRESTORE=0` and clearing `FIRESTORE_EMULATOR_HOST`.
- The smoke now passes:
  - `/api/health` -> `{ status: "ok", service: "spinshare-web" }`
  - `/api/market` -> one seeded `SpinShare Local` sample campaign
    (`cmp-local-demo`, `$30.00 / 1k imps`, `$50.00` remaining budget).
- This check is now repeatable through:
  `corepack pnpm@9.12.0 smoke:local-sample`.
  The command starts `dev:sample`, validates health + market, signs in with the
  fixed local developer credentials, approves a device flow, validates
  authenticated `/api/ad`, prints compact JSON summaries, stops the spawned
  server, and exits `0` on success.
- Latest successful smoke output included:
  - `health={"status":"ok","service":"spinshare-web"}`
  - `market={"liveCampaigns":1,"campaignId":"cmp-local-demo",...}`
  - `ad={"campaignId":"cmp-local-demo","adText":"SpinShare Local - sample ad for localhost testing",...}`

Local CLI smoke update:

- A real `corepack pnpm@9.12.0 smoke:local-cli` initially rendered the
  `SpinShare Local` sample ad and emitted an OSC8 `/api/click` URL, but timed
  out waiting for the CLI process to exit. The dev server logs showed
  authenticated `/api/ad`, `/api/track`, and the follow-up `/api/ad` all
  returned `200`, so the failure was process lifecycle, not ad serving.
- Direct node-pty verification showed the Windows PTY emits `onExit` for
  `node fake-ai.js`, but the native PTY handle can keep the Node event loop
  alive unless the direct CLI binary exits explicitly.
- `cli-wrapper/src/wrap.ts` now cleans up PTY data/exit subscriptions and pauses
  stdin when it had resumed stdin forwarding.
- `cli-wrapper/src/index.ts` now routes direct binary execution through a
  testable helper that calls `process.exit(code)` after `main()` resolves and
  `process.exit(1)` after a safe `spinshare:` error on rejection.
- Verification:
  - RED focused `wrap.test.ts` failed because resumed stdin was not paused after
    PTY exit.
  - RED focused `index.test.ts` failed because `runDirectExecution` did not
    exist.
  - GREEN focused `index.test.ts` + `wrap.test.ts` passed with 27 tests.
  - Full CLI tests passed with 12 files / 100 tests.
  - CLI typecheck passed with
    `corepack pnpm@9.12.0 --filter @spinshare/cli lint`.
  - Real runtime smoke now passes:
    `corepack pnpm@9.12.0 smoke:local-cli` builds the CLI and prints
    `cli={"exitCode":0,"renderedLocalAd":true}`.

Local checkout smoke update:

- Added a repeatable mock-payment smoke for the homepage advertiser purchase
  contract:
  `corepack pnpm@9.12.0 smoke:local-checkout`.
- The first runtime run exposed a real dashboard ownership bug: local device
  tokens minted through `MockAuthProvider.approveDeviceByUserCode()` dropped
  the browser session email, so `/api/campaigns` could not include
  `publicAdvertiserIdForEmail(claims.email)` and same-email homepage purchases
  were invisible in the advertiser dashboard.
- The mock auth provider now preserves optional `email`, `provider`, and `role`
  approval claims when minting device tokens through the user-code approval
  path. A regression test covers this.
- Latest successful smoke output proved the local homepage purchase path end to
  end:
  - `checkout` -> settled mock checkout, funded purchased campaign;
  - `market` -> two live campaigns, purchased campaign ranked #1 at
    `$50.00 / 1k imps`;
  - `ad` -> authenticated `/api/ad` selected the purchased campaign;
  - `campaigns` -> same-email advertiser dashboard showed the purchased
    campaign with `shows: 1`;
  - `activity` -> advertiser activity included both `checkoutStarted` and
    `budgetFunded`.

Full functional audit update:

- Fresh verification after the user asked whether "all functions" are fixed:
  - `corepack pnpm@9.12.0 smoke:local-checkout` passed;
  - `corepack pnpm@9.12.0 smoke:local-cli` passed;
  - `corepack pnpm@9.12.0 --filter @spinshare/web test -- scripts/smoke-local-checkout.test.mjs src/server/adapters/memory/memory-adapters.test.ts`
    passed with 21 tests;
  - `corepack pnpm@9.12.0 --filter ./vscode-extension test -- scripts/package-variant.test.mjs`
    passed with 4 tests;
  - `corepack pnpm@9.12.0 test` passed: core 39 tests, web 300
    tests with 1 skipped Firestore integration test, CLI 100 tests, extension
    67 tests;
  - `corepack pnpm@9.12.0 lint` passed across core, web, CLI, and extension.
- Current answer: the local happy path for extension/CLI sample ads, homepage
  mock purchase, leaderboard, authenticated ad feed, advertiser dashboard, and
  advertiser activity is fixed and repeatably verified.
- Not all product functionality is finished. Remaining gaps:
  - real Stripe test/live webhook delivery and checkout-status behavior still
    need an external smoke against durable storage;
  - real Stripe Connect withdrawal still needs an external test/live smoke;
  - real Claude Code TUI placement/click behavior still needs manual runtime
    verification in the native app/terminal;
  - ad safety currently has deterministic copy/URL gates plus review status,
    but the async LLM/manual/reputation review worker is not implemented;
  - production readiness still depends on correct production env
    (`SPINSHARE_MODE=production` plus flush/cron secret) and scheduled flush.

E2E status:

- `corepack pnpm@9.12.0 test:e2e` initially failed because the e2e tests were
  still asserting the old anonymous `/api/ad` and direct `/api/track` contracts.
- The tests were updated to match the current product contract:
  - anonymous `/api/ad` returns `401`;
  - the credited settlement path calls `GET /api/ad` with the same developer
    token before `POST /api/track`, creating the required cumulative progress
    record.
- `corepack pnpm@9.12.0 test:e2e` now passes: 3 files / 7 tests.
- Related verification also passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/ad/route.test.ts src/app/api/track/route.test.ts src/server/bidding-service.test.ts`
  with 3 files / 18 tests, and
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- Full normal regression passed after the e2e update:
  - `corepack pnpm@9.12.0 test`
    - core: 5 files / 39 tests; build passed;
    - web: 61 files passed, 1 skipped; 282 tests passed, 1 skipped;
    - CLI: 12 files / 97 tests;
    - VS Code extension: 8 files / 67 tests.
  - `corepack pnpm@9.12.0 lint` passed across core, web, CLI, and extension.

## 2026-06-17 Direct Product Q&A

These are the current code-backed answers to the most direct product questions.

- If a developer sees an ad, the developer dashboard shows earnings only after
  the authenticated `/api/ad` -> cumulative 3s `/api/track` -> flush-to-durable
  ledger chain completes. The dashboard runs one best-effort flush before
  reading `ledger.listByDeveloper()`, so it can catch up on refresh, but simply
  rendering an ad or viewing it for less than 3 seconds does not create earnings.
- If an advertiser pays from the homepage, the leaderboard and extension/CLI
  will show the campaign only after the campaign has funded budget in the same
  storage environment. Mock checkout funds immediately. Stripe test/live needs
  the webhook or checkout-status reconciliation to apply the budget.
- The advertiser dashboard can show homepage-purchased campaigns when the
  logged-in email matches the checkout email. It reads both the direct user id
  and `publicAdvertiserIdForEmail(email)`, then displays campaign telemetry:
  `shows` after `/api/ad`, `credited` after valid settlement, and `clicks` after
  valid clickable-ad redirects.
- Multiple paid advertisers do bid today. Selection is deterministic:
  highest CPM wins; ties go to earlier campaign creation, then lowest campaign
  id. This is winner-takes-current-auction, not weighted rotation.
- Withdrawals are not a UI-only stub, but they are not "automatic cash out" for
  a fresh account. They require a signed-in session, Stripe Connect onboarding,
  `payouts_enabled`, durable balance above the minimum, and enough Stripe
  platform balance. Real Stripe Connect payout still needs external smoke
  validation.
- CLI ads are clickable only in terminal surfaces that preserve OSC 8
  hyperlinks. `/api/ad` rewrites campaign destinations through `/api/click`,
  and `/api/click` redirects to the stored validated campaign URL while counting
  clicks only for valid signed click tokens.

## 2026-06-16 Current Functional Truth Table

This section answers the practical "does it work right now?" questions from the
current workspace implementation.

### Developer earnings after viewing an ad

**Answer: conditional, but dashboard reads now try to catch up.**

- `GET /api/ad` requires a valid `Device_Auth_Token`; unauthenticated clients get
  no ad.
- `POST /api/track` stores short view segments and only settles money after the
  same developer/campaign accumulates at least 3000 ms.
- When settlement happens, money first lands in the hot counter store and pending
  ledger queue.
- The developer dashboard reads durable ledger entries via
  `container.ledger.listByDeveloper(developerId)`, not the hot pending counter.
- The developer dashboard now runs one best-effort `runFlushCycle()` before that
  ledger read. `/api/payouts/status` does the same before reading durable
  `balanceCents`.
- The protected `/api/internal/flush` endpoint and an external scheduler are
  still needed for unattended production reconciliation.
- The activity feed may show impression attempts earlier because `/api/track`
  writes best-effort activity records directly.

Practical result: if a developer watches a valid funded ad for 3+ cumulative
seconds, the backend can credit it, and opening the dashboard/payout status now
tries to flush that credit into durable earnings. If the flush fails or there is
more pending work than one batch, the page can still show stale durable data
until `/api/internal/flush` runs successfully.

### Homepage payment, leaderboard, extension display, and advertiser dashboard

**Answer: works only if the paid campaign is actually funded in the same storage
environment the app is reading.**

- Homepage checkout creates a campaign with `budgetCents = 0`, then starts
  Stripe Checkout.
- In `STRIPE_MODE=mock`, checkout is settled immediately and the campaign is
  funded in the same request.
- In `STRIPE_MODE=test` or `STRIPE_MODE=live`, the campaign is not funded at
  checkout creation time. It needs either:
  - a valid Stripe `checkout.session.completed` webhook delivered to
    `/api/webhooks/stripe`, or
  - the post-checkout `/api/checkout-status?checkout_session_id=cs_...` reconcile
    path to retrieve a paid session and apply budget.
- As of 2026-06-17, when the checkout-status path confirms `funded`, the
  homepage dispatches a browser event and immediately reloads `/api/market`.
  Before this fix, a successfully funded campaign could still look missing from
  the public leaderboard until the next 15-second poll.
- The homepage leaderboard reads `/api/market`, which only lists campaigns from
  `campaigns.listBiddable()`: active campaigns with `budgetCents > 0` and
  `cpmCents > 0`, filtered by `publicOnLeaderboard !== false`.
- The extension/CLI/Claude adapter also use `/api/ad`, which selects only
  biddable funded campaigns. If funding did not apply, the paid ad will not show.
- Advertiser dashboard campaign ownership now checks both the signed-in user id
  and `publicAdvertiserIdForEmail(claims.email)`, so homepage campaigns can be
  visible after signing in with the same email used at checkout.
- Advertiser dashboard impressions are shown via campaign telemetry and durable
  ledger counts. "Shows" increments on `/api/ad`; "credited" increments on
  `/api/track` and durable ledger after flush. Some values can be ahead/behind
  depending on whether hot telemetry, activity rows, or durable ledger are being
  read.

Practical result: after a real Stripe test payment, if the leaderboard or
advertiser dashboard does not show the campaign, first suspect webhook/status
reconciliation, storage mismatch, or a login email that does not match the
checkout email, not bidding.

Verification added on 2026-06-17 for this payment visibility path:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/checkout-status/route.test.ts src/app/api/market/route.test.ts src/app/api/campaigns/route.test.ts src/app/checkout-status-banner.test.tsx src/app/page.test.tsx`
passed with 5 files / 25 tests, and `corepack pnpm@9.12.0 --filter @spinshare/web lint`
passed.

### Multiple advertisers and bidding

**Answer: yes, current bidding exists and is deterministic.**

- `selectWinner()` filters to campaigns with `budgetCents > 0` and
  `cpmCents > 0`.
- Highest `cpmCents` wins.
- Ties are broken by earlier `createdAtMs`, then lowest campaign id.
- This means the highest bidder keeps winning until it runs out of budget or
  becomes ineligible. It is not weighted rotation.

### Withdrawal / payout

**Answer: code path exists, but real cash-out requires more external state.**

- `/api/payouts/connect` creates or reuses a Stripe Connect account and returns
  an onboarding URL.
- `/api/payouts/status` reads Stripe account status and durable `balanceCents`.
- `/api/payouts/withdraw` requires:
  - signed-in browser session,
  - same-origin CSRF headers,
  - stored Stripe connected account id,
  - Stripe `payouts_enabled = true`,
  - durable balance at or above `MINIMUM_PAYOUT_CENTS`,
  - enough platform balance in Stripe test/live mode.
- The service debits durable user balance before creating the Stripe transfer and
  restores it if the Stripe call throws.
- The payout service also records durable provider reconciliation attempts:
  `blocked`, `pending`, `paid`, or `failed`, with amount and provider trace
  metadata.

Practical result: "Withdraw" is not fake, but it will not work for a fresh user
until Connect onboarding is complete, earnings have been flushed into durable
balance, and the platform Stripe account has transferable balance. The current
code now leaves an internal payout-attempt audit trail for reconciliation, but
live/test Stripe Connect settlement still needs an external smoke test.

### Clickable CLI ads

**Answer: partially yes, depending on terminal support.**

- CLI spinner-rendered ads use OSC 8 terminal hyperlinks when the ad response has
  `destinationUrl`.
- `/api/ad` rewrites campaign destinations through
  `/api/click?campaignId=...&clickToken=...`.
- `/api/click` always resolves the redirect target from the stored campaign and
  validates that destination before redirecting.
- Missing or invalid click tokens still redirect to the stored safe destination,
  but only a valid signed token minted by `/api/ad` increments `clicks`.
- Terminals without OSC 8 support render plain text and are not truly clickable.
- Claude Code statusLine scripts also output OSC 8 links and set
  `FORCE_HYPERLINK=1` in the VS Code adapter path.

Practical result: clickable ads can work in Windows Terminal, iTerm2, Kitty,
WezTerm, and VS Code integrated terminals that preserve OSC 8. They are not
guaranteed in every terminal or every Claude Code UI surface.

Verification on 2026-06-16:

- Web focused functional tests passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/track/route.test.ts src/app/api/ad/route.test.ts src/app/api/click/route.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/market/route.test.ts src/app/api/campaigns/route.test.ts src/app/api/checkout-status/route.test.ts src/app/api/payouts/status/route.test.ts src/app/api/payouts/withdraw/route.test.ts src/app/api/payouts/connect/route.test.ts`
  with 42 tests passing.
- CLI focused tests passed:
  `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/renderer.test.ts src/wrap.test.ts src/claude-code-adapter.test.ts src/api-client.test.ts`
  with 59 tests passing.

### Localhost isolation status

The earlier local isolation bug is fixed in the current workspace. Firestore
cloud writes can be namespace-isolated with `SPINSHARE_FIRESTORE_NAMESPACE=test`,
and local RTDB hot counters now derive their root from the same namespace instead
of defaulting to the shared `spinshare/hot` tree.

The remaining localhost risk is external validation, not this old code path:
real Stripe test webhook delivery, Firestore emulator write-through, and real
Claude Code terminal behavior still need smoke tests in the intended runtime.

### 2026-06-16 fix: local RTDB hot counter isolation

This P0 gap is now fixed in the current workspace.

- Production RTDB remains on the existing default root `spinshare/hot` unless an
  operator explicitly sets `SPINSHARE_RTDB_ROOT_PATH`.
- Local RTDB mode now derives a hot-counter root from
  `SPINSHARE_FIRESTORE_NAMESPACE`, falling back to `local` when no namespace is
  set:

  `spinshare/namespaces/<namespace>/hot`

- `buildCounterStore()` passes that root to `RealtimeDbCounterStore`, so local
  pending ledger entries, hot balances, campaign budget deltas, velocity,
  shadow-ban state, earning caps, and campaign telemetry no longer use the
  shared production hot tree by default.
- `SPINSHARE_RTDB_ROOT_PATH` is documented in `.env.example` for staging/custom
  deployments.
- Verification:
  - RED: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/container.test.ts`
    failed because `resolveRtdbRootPath` did not exist.
  - GREEN: the same focused command passed with 11 tests after implementation.

### 2026-06-16 fix: deterministic destination URL anti-phishing layer

The synchronous destination URL gate now rejects additional phishing-prone or
review-bypass shapes before campaign creation or Stripe checkout:

- punycode / IDN hostnames such as `xn--...`, which can visually imitate trusted
  brands;
- single-label hostnames such as `https://example/`, which are not ordinary
  public ad destinations;
- common URL shorteners such as `bit.ly`, `tinyurl.com`, and `t.co`, where the
  submitted URL hides the real landing page from synchronous review.

This applies through the shared `destinationUrlSchema`, so both homepage
checkout and authenticated dashboard campaign creation inherit it. Obvious
bypass shapes fail fast, and the later campaign `reviewStatus` field now gives
the async/manual review layer a way to keep borderline campaigns out of bidding
until they are approved.

Verification:

- RED: `corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`
  failed because at least one phishing-prone URL was accepted.
- GREEN: the same focused command passed with 24 tests after implementation.


## 目录
1. [产品是什么](#1-产品是什么)
2. [架构与各部件职责](#2-架构与各部件职责)
3. [当前问题全景](#3-当前问题全景)
4. [错误/不可用的功能](#4-错误不可用的功能)
5. [需要改进的地方](#5-需要改进的地方)
6. [行动优先级](#6-行动优先级)

---

## 1. 产品是什么

**SpinShare** 是一个开发者优先的广告交易平台，核心点：**在 AI 编程工具的「等待状态」（加载旋转图标 spinner）期间投放广告来变现**。

- 标语：*"Your AI is thinking. You should be earning."*（你的 AI 在思考，你该在赚钱。）
- 商业模型对标 Kickbacks.ai：开发者得 **60%** / 平台留 **40%**（对手 50/50），**无收入上限**。
- 平台覆盖：终端 CLI（Claude/Codex）+ GUI IDE（VSCode/Cursor/Trae/Kiro）。
- **核心交付物就是两个客户端**：VSCode 扩展 + npm CLI 包。web 是它们的后端。

### 理想流程（你要的样子）
1. 用户下载 extension 或 npm CLI；
2. 去主页登录，账号自动 sync 到客户端；
3. 后端 telemetry 记录用户、防机器人；
4. 用户用任何 CLI，广告**覆盖** loading；按时间计费；
5. 单条广告**累计**显示满 3 秒 → 给用户钱、扣广告商费；
6. 没满 3 秒（比如只显示 1 秒）→ 不扣费、不给钱，**下次继续显示同一条**，直到累计满 3 秒才双向记账；
7. 记账后继续竞价，出价高的继续显示，循环。

### 最新产品决策（2026-06-15）
- **MVP 不再追求“任意 CLI”。** 先把 Claude Code 原生 CLI/TUI 做准，后面再扩展 Codex、Gemini、其他 CLI。
- **用户必须无感。** 正常 UX 是用户只输入 `claude`；不能要求用户每次输入 `spinshare claude` 或手动执行某个 command。npm 路径现在通过 `spinshare login` 后自动安装 Claude Code adapter 来靠近这个目标。
- **先做 VSCode/Cursor/Trae 集成终端自动接管，再做全局 shell 接管。** extension/npm 的职责是安装、同步账号、接管启动链路；用户不应该感知包装器存在。
- **允许修改 `~/.claude/settings.json`。** 但必须备份、可恢复、可卸载，不能静默破坏用户原配置。
- **Claude Code 主路径改为官方 hooks/statusLine 适配器。** Claude Code 文档明确支持 lifecycle hooks（例如 `UserPromptSubmit`、`MessageDisplay`、`Stop`）和 `statusLine` command；这比外层猜 spinner 更接近“什么时候在 thinking / 什么时候结束”的事实源。
- **现有 spinner 拦截只能作为 fallback。** 它可以保留给没有官方生命周期 API 的 CLI，但不再作为 Claude Code MVP 的主要架构。

### 广告主购买模型（已确认）
- 主页购买不强制先注册：广告主输入邮箱、广告文案、链接、bid/block 数量并付款。
- 付款创建或更新 campaign，并把 campaign 归属到该邮箱。
- 广告主之后用同一个邮箱登录，即可 claim / 查看购买记录、预算、消耗、曝光。
- 如果广告主先注册再购买，也应该走同一套归属模型，不应出现“主页买”和“dashboard 充值”两套互相矛盾的 mental model。
- Dashboard 的主操作应该是“购买曝光 block / 增加预算”，而不是让用户先选东西再理解成“充值余额”。

### Activity ledger（缺失但必须做）
- 开发者需要看到每次广告活动：广告、开始时间、结束时间、显示时长、是否满 3 秒、是否记账、赚了多少钱、未记账原因。
- 广告主需要看到每次预算活动：购买、webhook 入账、每次可计费曝光扣费、剩余预算、无效/未满 3 秒曝光不扣费记录。
- 这不是纯 UI；后端需要把 impression attempt、credited impression、payment event、budget debit 串成可查询账本。

---

## 2. 架构与各部件职责

Monorepo（pnpm workspace）：**1 个基础库 + 3 个交付包**。

```
                 ┌─────────────────────────────────┐
                 │   @spinshare/core (纯函数)        │
                 │   资金 / 竞价 / 反欺诈 / 类型      │
                 └───────────────┬─────────────────┘
                                 │ 三方共同依赖（保证算钱永远一致）
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        web (后端+前端)     cli-wrapper        vscode-extension
        GET /api/ad         spawn 子进程       withProgress 通知
        POST /api/track     拦截 spinner       展示广告
        Stripe/账本         注入广告           3秒后上报
```

### 2.1 `packages/core` (`@spinshare/core`) — 纯函数基础库 ✅ 稳定
资金计算（整数分/微分，绝不浮点）、竞价选择、反欺诈 velocity 逻辑——所有包的**单一真源**。大量属性测试（fast-check）覆盖。**这是全项目质量最高的部分。**

### 2.2 `web/` (`@spinshare/web`) — Next.js 单体（后端+前端）✅ 基本可用
- **API**：`GET /api/ad`（竞价）、`POST /api/track`（账本结算）、`/api/advertiser-checkout`（公开充值）、`/api/webhooks/stripe`、`/api/auth/*`（设备授权）、`/api/campaigns`、`/api/payouts`。
- **存储**：Firestore（`users`/`campaigns`/`ledgerEntries`，持久）+ Firebase RTDB（热路径计数器，批量刷回 Firestore 省写入成本）。
- **认证**：NextAuth（Google/GitHub）做网页登录；CLI/扩展用设备授权流程（device flow）。
- **仪表盘**：开发者仪表盘（收益）、广告商仪表盘（建广告、充值）。

### 2.3 `cli-wrapper/` (`@spinshare/cli`) — 终端 CLI 包装器 ⚠️ 早期
装完提供 `spinshare` 命令，**必须包在别的 CLI 前面**：`spinshare node claude "..."`。
它 spawn 目标 CLI 当子进程 → 拦截 stdout → 逐帧判断是不是 spinner 字符（`|/-\`、`thinking/loading/...`）→ 是则吞掉、改显示广告 → 连续 ≥3 秒上报一次曝光 → 子进程退出返回退出码。

这就是当前“一坨逻辑”的核心：它不是 Claude Code 官方集成，而是在 Claude 外面套一层父进程，猜 stdout 里哪些字节代表等待状态。它能解释为什么代码复杂：要处理子进程、PTY、Windows shell、ANSI 控制码、OSC8 链接、spinner 分类、连续 3 秒 debounce、上报曝光。问题是它始终没有可靠语义：看到 `Thinking...` 不等于知道 Claude 何时真正开始/结束思考。

### 2.4 `vscode-extension/` — VSCode 扩展（兼容 Cursor/Trae）⚠️ 部分可用，仍需实机验证
两条投广告路径：
- **路径 A（生成钩子）**：注册命令 `spinshare.startGeneration`/`completeGeneration`，等宿主编辑器在 AI 生成时调用。
- **路径 B（终端自动包装）**：给终端里的 claude/codex 装 shim，实际跑 `spinshare ... claude`，复用 CLI 的 spinner 拦截。
- **路径 C（Claude Code 官方 adapter）**：安装 hooks/statusLine 到 `~/.claude/settings.json`，这是当前 Claude Code MVP 主路径。代码和单测已完成，真实 Claude Code TUI 还没手测。

extension 当前做的事可以概括为：
1. 启动时注册几个 SpinShare 命令和登录流程；
2. 往 VSCode/Cursor/Trae 集成终端的 `PATH` 前面塞一个 shim 目录；
3. 让终端里输入 `claude` 时先命中 `claude.cmd`/`claude.ps1` shim；
4. shim 再启动 bundled `cli-wrapper/dist/index.js`；
5. CLI wrapper 再启动真实 `claude`。

所以旧路径不是“理解 Claude Code”，而是“劫持 claude 启动命令，然后套旧的 spinner 猜测器”。这条路仍然有价值，因为它满足“用户只输入 `claude`”，但它应该只负责自动启动/兜底，不应该继续承担判断 thinking 状态的主责任。Claude Code 的主判断路径已经转向 hooks/statusLine。

### 2.5 新目标：Claude Code 官方适配器（MVP 主路径）
Claude Code 有两个比猜 stdout 更可靠的官方入口：
- **Hooks**：Claude Code lifecycle 会触发 hook，并把 JSON context 传给 handler；相关事件包括 `UserPromptSubmit`、`MessageDisplay`、`Stop`、`StopFailure` 等。适合记录“turn 开始/展示/结束”的事实。
- **Status line**：`~/.claude/settings.json` 可以配置 `statusLine` command，Claude Code 会把会话 JSON 通过 stdin 传给脚本，脚本输出的内容会显示在 Claude Code UI 的状态行。适合做你截图里的 inline ad surface。

MVP 应该变成：
1. extension/npm 安装 Claude Code adapter；
2. adapter 备份并 patch `~/.claude/settings.json`；
3. hooks 负责告诉 SpinShare “prompt 开始 / message 正在显示 / turn 结束”；
4. statusLine 负责把当前应展示的广告渲染进 Claude Code TUI；
5. shim 只保留为“用户输入 `claude` 时确保环境变量、账号 token、adapter 可用”的启动层。

这条路也解释了“能不能适配更多 IDE”：**可以，但不是一个万能钥匙。** 只要某个 IDE/CLI 暴露类似 lifecycle hook、status line、extension API 或可控 terminal renderer，就能写对应 adapter；没有这些 API 的工具才退回 PTY/stdout 猜测。

### 2.6 三大核心引擎（都在 web）
1. **竞价引擎** `GET /api/ad`：所有 `budget>0` 的活跃广告里，**最高 CPM 获胜**（平手按创建时间→id）。确定性、与输入顺序无关。
2. **账本引擎** `POST /api/track`：按曝光结算。例 $30 CPM = $0.03/次，开发者得 $0.018（60%）。原子地加余额、扣预算、写账本。
3. **反欺诈**：>30 印象/分钟 → **影子封禁**（照样投放不记费，对开发者不可区分）；收益上限 $20/小时、$300/天；shadow-ban 60 分钟自动解。

---

## 3. 当前问题全景

按严重程度从高到低。**最关键的事实：后端代码质量很高，大部分「坏」是配置矛盾、死代码、和一个产品级缺口，不是逻辑 bug。**

### 🔴 问题 1：广告「触发链路」断裂（产品级，最致命）

**这是「Claude 在 baking 却看不到广告」「插件这么难弄」的根本原因。**

extension 两条路径都不通：
- **路径 A 悬空**：`vscode-extension/src/extension.ts:162` 注册的 `spinshare.startGeneration` 命令，设计上要等 Cursor/Trae/Claude 在生成时调用。但**这些编辑器根本不会调用这个命令**——没有任何宿主集成契约。钩子永远不触发 → 永远不拉广告。
- **路径 B 脆弱**：终端 shim 思路对，但 Windows 下 PTY + spinner 拦截 + ANSI/OSC8 组合很脆弱。

CLI 能工作但**要求用户改变习惯**（每次打 `spinshare ...`），体验存疑。

**根因**：难不在广告业务（竞价/分成/反欺诈都很标准），难在**「怎么知道 AI 正在转圈」这个触发问题**。代码花了海量篇幅在「绕」这个本不该由我们解决的问题上：

| 尝试的手段 | 代码 | 问题 |
|-----------|------|------|
| 猜 spinner 字符（`|/-\`、单词） | `cli-wrapper/src/renderer.ts:25-42` | 各家 spinner 格式不同，猜不全，误判多 |
| 装 PTY 假终端 | `cli-wrapper/src/wrap.ts:216` | Windows 下脆弱，原生模块编译坑 |
| Windows 命令引号转义 | `cli-wrapper/src/wrap.ts:173` | 极易出错，调试痛苦 |
| 盼宿主编辑器调钩子 | `vscode-extension/src/extension.ts:162` | Cursor/Trae 不调，契约不存在 |
| 终端装 shim | `vscode-extension/src/terminal-auto-wrap.ts` | 脆弱，污染用户环境 |

**新的判断**：Claude Code MVP 不应该继续把“猜 spinner”当主路径。更好的方案是用 Claude Code 官方 hooks/statusLine 得到 lifecycle 事件和可渲染状态行。这样至少对 Claude Code 原生软件，我们不再需要猜 `Thinking...` 的文本样式，而是把它当成一个明确适配的 host。

这不是说 shim 没用。shim 仍然有两个用处：
- 让用户只输入 `claude`，无感进入 SpinShare 管理的环境；
- 在没有官方 statusLine/hook 的工具上，保留 stdout/PTY 猜测 fallback。

但 Claude Code 的主路径应调整为：**启动接管（shim/extension）+ 官方 lifecycle 事件（hooks）+ inline surface（statusLine）+ 后端账本**。

### 🟡 问题 2：`.env` 模式曾自相矛盾（已加 guard，仍需外部闭环）

诊断时的 `.env`：
```
SPINSHARE_MODE=local      ← 本地模式
AUTH_MODE=oauth           ← 生产认证
STRIPE_MODE=test          ← 生产支付（真 Stripe）
SPINSHARE_COUNTER=rtdb    ← 生产计数器（真 RTDB）
```

这是「**本地壳 + 生产内脏**」的矛盾组合。关键证据是 `useFirestoreInLocal()` 的选择逻辑：
- `SPINSHARE_MODE=local` 且没设 `SPINSHARE_USE_FIRESTORE=1`、没设 `FIRESTORE_EMULATOR_HOST` → **返回 false** → 走**内存 repo**。
- `container.ts:217`：本地模式 + dev → `seedLocalTestData()` 往内存**灌假数据**。

**后果**：当本地用真实 Stripe test 但 durable repo 仍是 memory 时，Checkout 可以在 Stripe 里成功，但 campaign/payment 状态只在当前 Node 进程里，重启、回调打到不同实例、或 webhook 没转发都会让排行榜/dashboard 看不到。

**当前状态**：代码已加两个 guard：local `STRIPE_MODE=test|live` 必须使用 Firestore durable storage；local 直连 cloud Firestore 必须设置 `SPINSHARE_FIRESTORE_NAMESPACE`。剩下不是这个旧配置 bug，而是要把本机 Stripe CLI webhook、Firestore emulator/namespace 和真实 Claude Code 跑通。

### 🔴 问题 3：Stripe test 付款后排行榜不上榜（最新诊断）

你说的「我跑了 Stripe test，付费后排行榜不显示」在当前代码里最可能不是 Stripe 收款失败，而是**付款完成后的 budget 入账没有发生，或入账写到的存储和排行榜读取的存储不是同一个**。

完整链路是：
1. 主页表单 `web/src/app/advertiser-checkout-form.tsx:162` 调 `POST /api/advertiser-checkout`；
2. `web/src/app/api/advertiser-checkout/route.ts:50` 先创建一个 `budgetCents=0` 的 campaign；
3. `route.ts:62` 创建 Stripe Checkout session；
4. 只有 `checkout.settled === true` 时，`route.ts:71-73` 才会当场加预算。这个只会在 `STRIPE_MODE=mock` 发生；
5. `STRIPE_MODE=test/live` 下 `StripeGateway.createCheckoutSession()` 返回 `{ url, sessionId }`，没有 `settled`（`web/src/server/adapters/stripe/stripe-gateway.ts:108`）；
6. 因此真实 Stripe test 付款后，必须等 Stripe webhook 打到 `POST /api/webhooks/stripe`；
7. webhook 在 `web/src/app/api/webhooks/stripe/route.ts:59-69` 验证 `checkout.session.completed` 后，才会 `applyBudgetDeltaCents()`；
8. 主页排行榜每 15 秒请求 `/api/market`（`web/src/app/page.tsx:377-409`）；
9. `/api/market` 只读取 `campaigns.listBiddable()`（`web/src/app/api/market/route.ts:87`），而 Firestore repo 的 `listBiddable()` 只查 `budgetCents > 0`（`web/src/server/adapters/firestore/campaign-repo.ts:45-53`）。

所以结论很明确：**Stripe test 付款成功后，如果本地没有用 `stripe listen` 把 webhook 转发到 `http://localhost:3000/api/webhooks/stripe`，或 `STRIPE_WEBHOOK_SECRET` 不是 Stripe CLI 给的本地 signing secret，campaign 会一直保持 `budgetCents=0`，排行榜必然不显示。**

另外还有两个相关问题：
- 如果 `.env` 是 `SPINSHARE_MODE=local` + `STRIPE_MODE=test`，但没有 `SPINSHARE_USE_FIRESTORE=1` 或 `FIRESTORE_EMULATOR_HOST`，campaign 创建和 webhook 入账都会落在内存 repo；现在 `buildContainer()` 会 fail fast，阻止这种组合继续误导测试。
- Firestore 已支持 `SPINSHARE_FIRESTORE_NAMESPACE=test`，集合会写到 `namespaces/test/...`；并且本地模式如果用 `SPINSHARE_USE_FIRESTORE=1` 直连真实 cloud Firestore，现在会强制要求 namespace，避免 localhost 写真实顶层集合。
- 2026-06-16 又确认一个 dashboard 归属 bug：`/dashboard/advertiser/page.tsx` 之前 mint dashboard bearer token 时只带 `userId`，没有带 `session.user.email`。结果主页按邮箱创建的 public checkout campaign 即使同邮箱登录，也不会被 `/api/campaigns` claim 到。已修：dashboard token 现在带 `email` 和 `role: "advertiser"`，production `NextAuthDeviceProvider.mintToken()` 也会保留 optional claims。
- 2026-06-16 本机 preflight 结果：`corepack pnpm@9.12.0 verify:local-runtime` 仍失败，因为 `stripe` 不在 PATH，且 Java 是 `1.8.0_491`（Firestore emulator 需要 Java 11+）。因此本机真实 Stripe test webhook/Firebase 闭环还没有跑通。

验证过的测试：`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/advertiser-checkout/route.test.ts src/app/api/market/route.test.ts src/app/api/webhooks/stripe/route.test.ts`，9 个相关单元测试通过。这说明 mock 付款、market 排行榜、webhook 幂等入账的单元逻辑是好的；坏点更可能在本地 Stripe webhook/环境隔离，而不是纯业务函数。

### 🟢 问题 4：累计型计费已进入代码路径，旧 fallback 仍需降级

你要的是**累计型**。旧 CLI spinner 设计曾经是**连续型**，现在主代码路径已经改成累计型：

| 维度 | 你要的（累计型） | 当前状态 | 代码位置 |
|------|----------------|------------------|---------|
| 3 秒判定 | **累计**满 3 秒（可跨多次显示） | core/web/CLI/extension/Claude hook 都支持短片段累计 | `track/route.ts` + progress repos |
| 未满 3 秒 | **记住这个广告**，下次继续同一个 | web pending progress 会让 authenticated developer 优先拿回未完成广告 | `bidding-service.ts` / `/api/ad` |
| 记账时机 | 累计满 3 秒那一刻，双向记账 | 后端累计满 3000 ms 后才走 ledger settlement | `/api/track` |

**当前实现状态**：累计型 3 秒代码路径已经完成。core 接受正数短片段；web 存储 pending progress 并在累计满 3000 ms 时结算；CLI、VS Code extension、Claude Code generated hook 都会上报短片段。剩余风险是 Firestore emulator 写穿和真实 Claude Code TUI 实机验证。

### 🟡 问题 5：广告商付款入口分叉，`/api/funds/checkout` 不是死代码但不完整

之前判断 `/api/funds/checkout` 是死代码，这一点被当前代码推翻：`web/src/app/dashboard/advertiser/campaign-list.tsx:100-110` 的 Add Funds 确实会调用它，并且会带 `Device_Auth_Token`。

核心安全和 redirect 问题已经修掉，但项目仍有两条付款入口，需要继续统一产品语义。

| 入口 | 调用方 | 做什么 | 风险 |
|------|--------|--------|------|
| `/api/advertiser-checkout` | 主页公开表单 | 创建 campaign + 创建 Stripe session；mock 模式当场加预算 | test/live 必须依赖 webhook，否则不上榜 |
| `/api/funds/checkout` | 广告商仪表盘 Add Funds | 给已有 campaign 创建 Stripe session | 已补 `successUrl/cancelUrl`、ownership 校验、route tests；test/live 仍依赖 webhook |

当前证据：
- `web/src/app/api/funds/checkout/route.ts` 会读取 campaign 并确认它属于当前 advertiser；
- checkout session 会带 dashboard success/cancel URL；
- mock checkout settled 时会立即给 campaign 加预算；
- `web/src/app/api/funds/checkout/route.test.ts` 覆盖 ownership、redirect URL、mock settled 入账。

所以这里不是「死代码」；核心工程缺陷已修。剩余问题是产品语义：主页是“邮箱 + 创建广告 + 买 block”，dashboard 是“已有 campaign + add funds”，两者需要在 UI/文案上统一成同一个购买模型。

### 🟢 问题 6：旧 LearnX mock data 已移除

`web/src/server/dev/seed-local-data.ts` 之前在本地 seed 里塞入 LearnX campaign：

- `id: "cmp-local-demo"`
- `adText: "LearnX · Know exactly what to study"`
- `brandName: "LearnX"`
- `budgetCents: 5000`
- `cpmCents: 3000`

这能让空项目本地启动后看起来有数据，但会干扰真实调试：你付费后看排行榜，很难分清看到的是 seed 的 LearnX，还是自己刚付款的 campaign。现在已经改成默认不 seed；只有显式设置 `SPINSHARE_SEED_LOCAL_DATA=1` 才会注入一个明确标记为 `SpinShare Local` 的 sample campaign，不再使用 LearnX。

### 🟢 问题 7：本地连云端的数据一致性风险（承接问题 2 和 3）

即使你想本地连云端，`SPINSHARE_MODE=local` 默认也不连 Firestore。但你配了真私钥——这让**认证（OAuth）连真 Firebase，业务数据走内存**。账户能登进去但看不到自己的真实数据。

反过来，如果你设置 `SPINSHARE_USE_FIRESTORE=1`，现在必须同时设置 `SPINSHARE_FIRESTORE_NAMESPACE=test`（或使用 `FIRESTORE_EMULATOR_HOST`）。否则 `buildContainer()` 会 fail fast，不让 localhost 直接写真实顶层 Firestore 集合。

---

## 4. 错误/不可用的功能

| 功能 | 状态 | 原因 | 证据 |
|------|------|------|------|
| Extension 路径 A（生成钩子显示广告） | ❌ 完全不可用 | 宿主编辑器不调钩子，契约不存在 | `extension.ts:162` |
| Extension 路径 B（终端自动包装） | ⚠️ 早期/不稳 | 能尝试让用户只输入 `claude`，但仍依赖旧 spinner 猜测器判断 waiting | `terminal-auto-wrap.ts` |
| Claude Code 官方 adapter（hooks/statusLine） | ⚠️ 已实现静态路径 | extension 会安装/备份/patch `~/.claude/settings.json`；生成 hooks/statusLine 脚本；仍需真实 Claude Code TUI 手测 | `claude-code-adapter.ts` |
| 「AI 等待→看到广告」端到端 | ⚠️ 代码路径已接上，实机未证明 | hooks/statusLine 不再依赖猜 spinner；真实 Claude Code UI 位置、刷新和路径行为仍需手测 | — |
| Stripe test 付款后排行榜上榜 | ⚠️ 本地易失败 | test/live 不会当场加预算，必须依赖 webhook；localhost 常没转发 webhook | 问题 3 |
| `/api/funds/checkout` | ✅ 已修正核心问题 | 仪表盘 Add Funds 会校验 campaign ownership、传 success/cancel URL，mock settled 会入账；仍需真实 Stripe test webhook 手测 | 问题 5 |
| Firestore localhost 隔离 | ✅ 已实现核心 guard | namespace 路径和 local cloud Firestore fail-fast 已有单测；真实 emulator 写入仍需端到端验证 | `collections.ts` / `container.ts` |
| Local sample data | ✅ 默认关闭 | 只有 `SPINSHARE_SEED_LOCAL_DATA=1` 才 seed 明确标记的 `SpinShare Local` sample campaign | `seed-local-data.ts` / `container.ts` |
| 本地端到端跑通 | ⚠️ 外部闭环未验证 | 代码 guard 已阻止 Stripe test + memory durable store；仍需 Stripe CLI webhook + Firestore emulator/namespace 实测 | 问题 2/3 |

### ✅ 这些功能是好的（别误判）
- `@spinshare/core` 资金/竞价/反欺诈（属性测试覆盖，逻辑严谨）
- 竞价引擎 `GET /api/ad`
- 账本引擎 `POST /api/track`（含影子封禁、收益上限）
- **Stripe 公开充值** `/api/advertiser-checkout`（不要求登录，主页表单调用；mock 模式会当场入账）
- Stripe webhook 的单元逻辑（签名验证 + 幂等 claim + budget 增量）是好的；本地真实 Stripe test 需要正确 webhook 转发
- 设备授权登录 device flow（`cli-wrapper/src/login.ts`）
- 开发者/广告商仪表盘 UI

---

## 5. 需要改进的地方

### 5.1 产品级（最重要）

**P0 — Claude Code 官方适配器，替代“猜 spinner”主路径**
这是产品能否做出来的前提。当前决策不是继续追求“任意 CLI”，而是先把 Claude Code 原生 CLI/TUI 做准：
- 用户仍然只敲 `claude`，不能要求 `spinshare claude`；
- extension/npm 负责安装和自动接管；
- 优先用 Claude Code `hooks` 判断 turn lifecycle（prompt submit、message display、stop/failure）；
- 优先用 Claude Code `statusLine` 渲染 inline ad，而不是右下角弹窗；
- 旧的 stdout spinner 猜测只作为 fallback。

这条路的关键收益是：对 Claude Code，我们终于有 host 提供的生命周期信号，不必只靠 `renderer.ts` 猜 `Thinking...`、spinner 字符或 ANSI 输出。

**P0 — 广告主购买/归属模型统一**
主页购买和 dashboard 购买必须使用同一个 mental model：
- 未注册广告主可以在主页输入邮箱并付款；
- campaign 归属于购买邮箱；
- 后续用同邮箱登录即可 claim / 查看 dashboard；
- 已登录广告主购买时，也写入同一套 campaign/payment/ledger；
- dashboard 里应该是“购买曝光 block / 增加预算”，不是让用户困惑地“选择然后充值”。

**P0 — Activity ledger 产品化**
开发者和广告主都需要可解释账本：
- 开发者：每次显示、显示时长、是否满 3 秒、是否入账、赚了多少、未入账原因；
- 广告主：每次购买、webhook 入账、每次可计费曝光扣费、剩余预算、未满 3 秒不扣费记录；
- 后端需要区分 impression attempt 与 credited impression，否则无法解释“为什么这次看到了但没赚钱/没扣费”；
- 后端 activity API 已支持 newest-first 的 `limit`/`cursor` 分页；广告主侧已有加载更多、筛选、CSV 导出；开发者侧已有加载更多、搜索、CSV 导出。剩下是明细页、更多解释性状态等产品层打磨。

**P0 — 统一 `.env` 模式**
二选一，别混：
- 全生产：`SPINSHARE_MODE=production` + 全套 creds（`NEXTAUTH_URL`、`AUTH_VERIFICATION_URI`、`FIREBASE_*`、`STRIPE_*`、`AUTH_MODE=oauth`、`SPINSHARE_COUNTER=rtdb`）。
- 全本地：`STRIPE_MODE=mock`、`AUTH_MODE=mock`、`SPINSHARE_COUNTER=memory`，别配真私钥。
- 本地连真实服务测试：必须显式定义隔离策略。现在直连真实 Firestore 时必须设置 `SPINSHARE_FIRESTORE_NAMESPACE=test`；否则本地启动会报错。使用 emulator 时设置 `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` 即可。

**P0 — 建立 localhost 的 Stripe/Firebase 测试闭环**
如果要用 Stripe test 而不是 mock，就必须把这条链路固定下来：
- 本地启动 web；
- `stripe listen --forward-to localhost:3000/api/webhooks/stripe`；
- `.env` 使用 Stripe CLI 输出的本地 `STRIPE_WEBHOOK_SECRET`；
- checkout 完成后确认 webhook 返回 200；
- 确认同一个存储里的 campaign `budgetCents > 0`；
- 再看 `/api/market`。

Firestore 本地写入隔离已经有核心实现：`SPINSHARE_FIRESTORE_NAMESPACE=test` 会写入 `namespaces/test/...`，且 local cloud Firestore 没有 namespace 会直接报错。剩下要做的是跑真实 Firestore emulator/Stripe CLI 的端到端链路。

### 5.2 工程级

**P1 — 广告商仪表盘付款路径已修核心问题**
`/api/funds/checkout` 不是死代码。现在已经补了 dashboard `successUrl/cancelUrl`、campaign ownership 校验、mock settled 入账和 route tests。剩余是 Stripe test/live 的真实 webhook 端到端验证。

**P1 — LearnX seed 已移除，local sample 显式开关保留**
本地 seed 默认关闭；需要 demo 数据时用 `SPINSHARE_SEED_LOCAL_DATA=1` 显式开启。显式 seed 现在使用 `SpinShare Local` sample campaign，不再使用 LearnX。

**P1 — 把旧 spinner 猜测逻辑降级为 fallback**
Claude Code 主路径确定后，`renderer.ts` 的 spinner 字符猜测、`wrap.ts` 的 PTY/子进程包装、Windows 转义等逻辑不应继续决定 Claude Code 的计费事实。它们可以保留给没有官方生命周期 API 的 CLI，但要从“核心架构”降级成“兼容层/兜底层”。

**P2 — 累计型计费改造已完成代码路径**
core/web/CLI/extension/Claude Code generated hook 都已经支持短片段累计；剩余不是代码路径，而是真实 Firestore/Claude Code 运行环境验证。

**P2 — telemetry 强化**
你提到「后台 telemetry 记录用户确保不是机器人」。现有反欺诈（velocity、影子封禁、收益上限）已覆盖**计费侧**防刷，但**用户行为侧**的 telemetry（登录设备指纹、异常登录、多账号关联）目前没有。可作为独立工作项。

---

## 6. 行动优先级

| 优先级 | 动作 | 解决的问题 | 说明 |
|--------|------|-----------|------|
| **P0** | 实现 Claude Code 官方 adapter（hooks/statusLine） | 问题 1 | 静态实现和单测已完成；仍需真实 Claude Code TUI 验证 |
| **P0** | 统一 `.env` 模式 | 问题 2、7 | 让你能真正跑通端到端，区分真假数据 |
| **P0** | 打通 Stripe test webhook + Firestore test namespace | 问题 3、7 | namespace guard 已实现；仍需真实 Stripe CLI/webhook + emulator 端到端验证 |
| **P0** | 统一广告主购买/归属模型 | 问题 5 + 新决策 | 主页邮箱购买、同邮箱登录 claim、dashboard 购买 block |
| **P0** | Activity ledger 产品化 | 问题 4 + 新需求 | 核心时间线已包含 attempt、payment、webhook、budget debit；后端 API 分页已完成；广告主已有加载更多/筛选/导出，开发者已有加载更多/搜索/导出；还需明细视图、解释性状态打磨 |
| ✅ | 修正 `/api/funds/checkout` 仪表盘充值路径 | 问题 5 | 已补 redirect URL、ownership 校验、route tests、mock settled 入账 |
| ✅ | 删除 LearnX mock data，保留 local sample 开关 | 问题 6 | 已默认关闭，显式 `SPINSHARE_SEED_LOCAL_DATA=1` 才开启 `SpinShare Local` sample |
| P1 | 旧 spinner 猜测逻辑降级为 fallback | 问题 1 的代码面 | Claude Code 不再依赖猜 stdout 作为事实源 |
| ✅ | 累计型计费改造 | 问题 4 | 代码路径已完成；仍需真实 Firestore/Claude Code 运行环境验证 |
| P2 | 用户行为 telemetry | 新增 | 反机器人强化 |

---

## 7. 已执行的修复（2026-06-15）

这一批已经进入代码，并有测试验证：

- **Claude Code adapter 已接入 extension 和 npm CLI**：extension activation 默认安装 Claude Code hooks/statusLine adapter；npm CLI 新增 `spinshare setup claude-code`，且 `spinshare login` 成功后会自动安装同一类 adapter。adapter 会备份并 patch `~/.claude/settings.json`，写入 generated hook/statusLine 脚本。当前脚本支持 inline statusLine 广告、hook 拉广告/清理状态；只有存在 `SPINSHARE_TOKEN` 或 CLI 文件凭据时才拉广告；`GET /api/ad` 和 `POST /api/track` 都会带 bearer token，所以后端可以为同一 developer 优先返回未满 3 秒的 pending ad；任意正数 view segment 都会上报给后端累计；`statusLine.refreshInterval=1` 用于更快显示 thinking 期间的广告；hook/statusLine 都会读取 Claude stdin JSON 的 `session_id`，避免跨会话 stale state 误显示或误上报。
- **Claude Code adapter 已有可撤销路径**：npm CLI 支持 `spinshare setup claude-code --remove`；VSCode/Cursor/Trae 扩展新增 `SpinShare: Remove Claude Code Adapter` 命令；当 `spinshare.claudeCodeAdapter=false` 时，扩展会移除当前 adapter，而不是只停止未来安装。移除逻辑只删除 SpinShare 写入的 statusLine/hooks，保留用户其他 Claude settings 和 hook handlers，并 best-effort 清理 generated scripts/state。
- **Claude settings 解析已修 Windows BOM 风险**：Windows PowerShell 写 JSON 时可能带 UTF-8 BOM，旧 installer 会 `JSON.parse` 失败并把现有 Claude settings 当 `{}` 覆盖。现在 CLI/extension adapter 都会剥离开头 BOM 再解析；测试覆盖 BOM-prefixed settings 的 install/remove，确认用户 `theme` 和既有 hooks 不丢失。
- **VSIX 安装包已重建并检查**：`spinshare-0.2.0.vsix` 已重新生成；包内确认 extension manifest 包含 `spinshare.removeClaudeCodeAdapter`，bundled CLI 包含 `setup claude-code --remove`，compiled adapter 包含 BOM-safe `parseClaudeSettings()`。
- **npm CLI 包已修发布阻塞**：`cli-wrapper/package.json` 已移除 `private: true`，`bin.spinshare` 规范为 `dist/index.js`，运行时 dependencies 不再包含 `workspace:*`；`@spinshare/core` 仅作为 devDependency 类型来源。`npm publish --dry-run` 已通过，当前只剩真实发布需要 npm 登录。
- **Extension 登录 token 已同步给 Claude hooks**：`AuthManager` 新增 `FileTokenMirror`，extension sign-in 成功后会写入 CLI-compatible credential file，sign-out 时清理。这样 generated Claude hook 脚本可以读取同一份 token，不需要把 token 写进 `~/.claude/settings.json`。
- **npm CLI 登录 token 也会同步给 Claude hooks**：`spinshare login` 成功后会把 token mirror 到 file credential，并 best-effort 安装 Claude Code adapter；`spinshare setup claude-code` 会显式执行同一安装路径。
- **Dashboard Add Funds 修复**：`/api/funds/checkout` 现在会校验 campaign 是否存在、是否属于当前 advertiser；会传 dashboard success/cancel URL；mock checkout settled 时会立即给 campaign 加预算。
- **主页邮箱购买 → 同邮箱登录 claim**：抽出 `publicAdvertiserIdForEmail()`，主页 checkout 和 `/api/campaigns` 共用同一算法。dashboard server page 现在会把 `session.user.email` 放进 bearer token；production `NextAuthDeviceProvider.mintToken()` 也保留 optional claims，所以同邮箱登录能读取该 email 的 public checkout campaigns。
- **Firestore localhost 隔离**：新增 `SPINSHARE_FIRESTORE_NAMESPACE`，collection path 可变成 `namespaces/test/users`、`namespaces/test/campaigns` 等；本地模式用 `SPINSHARE_USE_FIRESTORE=1` 直连 cloud Firestore 时强制要求 namespace，避免 localhost 写真实顶层集合。
- **LearnX seed 已移除**：local development 不再默认 seed funded campaign；只有显式 `SPINSHARE_SEED_LOCAL_DATA=1` 才 seed 明确标记的 `SpinShare Local` sample campaign。
- **Attempt-level activity ledger 后端**：新增 `ActivityRepository`，`POST /api/track` 会记录 tooShort、invalidToken、invalidCampaign、credited、shadowBanned、earningCapped、duplicate 等每次曝光尝试；新增/升级 `GET /api/activity/developer` 和 `GET /api/activity/advertiser`，开发者和广告主都能查询 attempt-level 活动；两个 activity API 现在都返回 newest-first 的有界页面，支持 `limit`/`cursor` 和 `nextCursor`。

验证结果：
- 根级 `corepack pnpm@9.12.0 test` 通过：core/web/cli/extension 全部测试通过。
- 根级 `corepack pnpm@9.12.0 lint` 通过：core/web/cli/extension `tsc --noEmit` 全部通过。
- `@spinshare/web` 全量测试通过：40 files passed, 156 tests passed, 1 skipped。
- `vscode-extension` 全量测试通过：6 files passed, 39 tests passed。
- `vscode-extension` build 通过：`tsc -p ./` + bundled CLI wrapper。

## 8. 仍未完成/不能假装完成的部分

- **完整 activity ledger 产品还没完成**：后端 impression attempt store、developer/advertiser activity API、dashboard 最近活动 UI、payment/webhook/budget debit 事件账本已经进入同一时间线，activity API 分页也已完成；广告主 activity 已有加载更多、筛选、CSV 导出；开发者 activity 已有搜索、CSV 导出；还需要开发者分页、明细页和更强解释性状态。
- **累计型 3 秒计费代码路径已完成**：core/web/CLI/extension/Claude Code generated hook 都已经接受并上报短片段；后端保存 pending progress，累计满 3000 ms 才结算。剩余风险是 Firestore emulator 写穿和真实 Claude Code TUI 实机验证。
- **Token bridge 仍需真实环境验证**：代码已把 extension token mirror 到 CLI-compatible credential file；还需要在真实 VSCode/Cursor + Claude Code 环境确认权限、路径和 Windows 文件模式行为。
- **广告主 activity ledger 仍需产品打磨**：曝光 attempt、checkoutStarted、budgetFunded、budgetDebited 已进入 advertiser activity feed；后端分页、筛选、加载更多、CSV 导出已完成；还缺明细页和更清晰的状态解释等完整 ledger 体验。
- **全局 shell 接管还没做**：现在仍是 extension 集成终端为主；全局 PowerShell/Bash/Zsh PATH/shim 安装还没有实现。
- **Claude Code adapter 需要真实 Claude Code 手测**：单测验证了 settings merge、脚本生成、短片段上报、token gating、session gating、`refreshInterval` 和 ASCII 广告前缀；还需要在真实 Claude Code TUI 中验证 statusLine 位置、hook 触发频率、OSC8 链接显示、Windows Git Bash/PowerShell 路径行为。

## 附：诊断时验证过的关键事实
- 诊断时 `.env` 实际值：`SPINSHARE_MODE=local` / `AUTH_MODE=oauth` / `STRIPE_MODE=test` / `SPINSHARE_COUNTER=rtdb`（矛盾组合）。
- 当时 `useFirestoreInLocal()` 在未设置 `SPINSHARE_USE_FIRESTORE=1` 且未设置 `FIRESTORE_EMULATOR_HOST` 时返回 false → 本地走内存 repo。现在 local `STRIPE_MODE=test|live` 会要求 Firestore durable storage，避免这种组合继续启动。
- `container.ts` 本地 + dev 默认不再 seed sample campaign；只有 `SPINSHARE_SEED_LOCAL_DATA=1` 才会调用 `seedLocalTestData()`。
- `seed-local-data.ts:102-113` 现在保留 `SpinShare Local` funded campaign 作为显式 demo seed，不再使用 LearnX。
- `collections.ts` 支持 `SPINSHARE_FIRESTORE_NAMESPACE`；设置后集合写入 `namespaces/{namespace}/...`，未设置时仍使用顶层集合。`container.ts` 会阻止 local cloud Firestore 在未设置 namespace 时启动。
- 主页公开付款走 `/api/advertiser-checkout`（`advertiser-checkout-form.tsx`、`page.tsx`），真实 Stripe test/live 需要 webhook 才会把 budget 加到 campaign。
- 广告商仪表盘 Add Funds 走 `/api/funds/checkout`（`campaign-list.tsx:100-110`）；现在已补 campaign ownership、redirect URL、mock settled 入账和 route tests。
- 相关测试已通过：根级 `corepack pnpm@9.12.0 test` 全部通过，根级 `corepack pnpm@9.12.0 lint` 全部通过。
- 旧 `WaitStateTracker` 仍是 fallback 层的连续等待检测；Claude Code 主路径不应再依赖它作为计费事实源。
- 代码无 TODO/FIXME/HACK 标记——不是半成品堆砌，是设计决策导致的问题。
- Claude Code 官方 Hooks 文档说明 lifecycle hooks 会在 Claude Code session 的特定点触发，并向 handler 传 JSON context；事件包含 `UserPromptSubmit`、`MessageDisplay`、`Stop`、`StopFailure` 等。
- Claude Code 官方 Status line 文档说明可在 `~/.claude/settings.json` 配置 `statusLine` command；Claude Code 会把 JSON 通过 stdin 传给脚本，脚本 stdout 会成为状态行内容。Windows 下也有 PowerShell 配置示例。

## 附：当前“一坨逻辑”的职责拆解
| 层 | 当前在干什么 | 问题 |
|----|-------------|------|
| VSCode extension | 注册命令、登录、安装 terminal shim、改集成终端 PATH | 生成命令没人调用；shim 只解决启动，不解决 thinking 语义 |
| terminal shim | 让用户输入 `claude` 时先进入 SpinShare launcher | 能做到无感启动，但环境接管脆弱 |
| launcher | 找 bundled CLI wrapper，再运行 `spinshare ... claude` | 又多了一层进程和 Windows/引用转义问题 |
| CLI wrapper | spawn 真实 Claude，读取 stdout/stderr | 它在外部观察 Claude，不是 Claude 官方事件 |
| `renderer.ts` | 猜哪些 chunk 是 spinner/thinking/status | Claude TUI 输出变一次就可能失效 |
| `WaitStateTracker` | 连续 spinner 满 3 秒才上报 | 与“累计满 3 秒”产品逻辑不符 |
| `POST /api/track` | 真正扣广告主预算、给开发者入账 | 后端账本本身相对健康，但前面的触发事实不可靠 |

结论：这套逻辑的目标是“在不知道 Claude 内部状态的情况下，靠外层终端输出猜 waiting 并塞广告”。它不是毫无用处，但方向错在把最不稳定的 UI 输出当事实源。Claude Code MVP 应该改成“官方 hook 给事实，statusLine 给展示，shim 只负责无感启动”。

## 附：本地真实运行环境验证（2026-06-15）

新增 `corepack pnpm@9.12.0 verify:local-runtime` 作为 localhost 外部依赖 preflight。它检查 Node、`claude`、`stripe`、`firebase`、`npx`、Java 版本，以及 local Firestore 是否启用了 emulator 或 namespace 隔离。

本机当前实测结果：

- `claude` 已安装，真实命令 `claude.CMD --version` 返回 `2.1.170 (Claude Code)`。
- `firebase` 已安装，真实命令 `firebase.CMD --version` 返回 `14.26.0`。
- `spinshare setup claude-code` 已真实执行成功，adapter 安装到 `C:\Users\noahz\.claude\settings.json`；backup 存在，hook/statusLine 脚本存在，settings 文件不包含 token。
- `stripe` 不在 PATH，所以 Stripe test webhook 本地闭环还不能验证。必须先安装 Stripe CLI，再运行 `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`。
- Firestore emulator 当前被 Java 8 阻塞：本机 `java -version` 是 `1.8.0_491`，Firestore emulator jar 报 `UnsupportedClassVersionError`（class file 55.0，Java 8 只能识别到 52.0）。需要安装 JDK 21（至少 JDK 11）后再跑 emulator。

这解释了为什么“Stripe test 付款后排行榜不显示”不能只看 Checkout 成功页：真实 Stripe test/live 模式下，campaign 预算只会在 webhook 到达并写入同一个 Firestore/namespace 后增加。没有 Stripe CLI webhook 或本地存储隔离没跑通时，排行榜不会稳定反映付款结果。

下一步验证顺序应该固定为：

1. 安装 Stripe CLI 和 JDK 21。
2. 运行 `corepack pnpm@9.12.0 verify:local-runtime`，直到外部依赖全部通过。
3. 用 Firestore emulator 或 `SPINSHARE_FIRESTORE_NAMESPACE=test` 跑本地 web。
4. 运行 `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe` 并复制 `whsec_...` 到 `.env`。
5. 完成一次 Stripe test Checkout，确认 webhook 200、campaign budget 增加、`/api/market`/排行榜读取到同一个 campaign。
6. 打开真实 Claude Code，确认 statusLine 广告显示、Stop hook 上报、activity ledger 出现 attempt/credited rows。

## 附：关键文件索引
| 想看什么 | 去哪里 |
|----------|--------|
| 资金分成算法 | `packages/core/src/money.ts` → `computeSplit` |
| 竞价选择 | `packages/core/src/bidding.ts` → `selectWinner` |
| 反欺诈/速度窗口 | `packages/core/src/velocity.ts` |
| 领域类型与 API 契约 | `packages/core/src/types.ts` |
| 账本引擎（服务端） | `web/src/server/ledger-service.ts` |
| 容器/适配器选择（env 矛盾点） | `web/src/server/container.ts` |
| 竞价路由 | `web/src/app/api/ad/route.ts` |
| 上报路由 | `web/src/app/api/track/route.ts` |
| 主页公开充值 | `web/src/app/api/advertiser-checkout/route.ts` |
| 仪表盘 Add Funds 充值 | `web/src/app/api/funds/checkout/route.ts` |
| Stripe webhook 入账 | `web/src/app/api/webhooks/stripe/route.ts` |
| 主页排行榜 API | `web/src/app/api/market/route.ts` |
| Firestore collection 命名 | `web/src/server/adapters/firestore/collections.ts` |
| 本地 sample seed | `web/src/server/dev/seed-local-data.ts` |
| CLI spinner 拦截 | `cli-wrapper/src/renderer.ts` |
| CLI 子进程包装 | `cli-wrapper/src/wrap.ts` |
| CLI 登录流程 | `cli-wrapper/src/login.ts` |
| 扩展入口 | `vscode-extension/src/extension.ts` |
| 扩展广告控制器 | `vscode-extension/src/ad-controller.ts` |
| 扩展终端自动包装 | `vscode-extension/src/terminal-auto-wrap.ts` |
| Claude Code 用户配置（目标） | `~/.claude/settings.json` |
| Claude Code hooks 文档 | `https://code.claude.com/docs/en/hooks` |
| Claude Code statusLine 文档 | `https://code.claude.com/docs/en/statusline` |
| 原始产品规格 | `docs/project_architecture.md` |
| 生产自测指南 | `docs/production-test-guide.md` |

## 2026-06-15 dashboard activity ledger update

- Developer dashboard activity now reads attempt-level activity rows, not only credited ledger rows. It can show credited and non-credited outcomes with status, duration, and credit labels.
- Advertiser dashboard now loads `/api/activity/advertiser` with the existing dashboard bearer token and renders a Recent activity feed below campaign management.
- Shared UI normalization lives in `web/src/app/dashboard/activity-feed.ts`.
- Verified focused UI coverage: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx`.

## 2026-06-16 checkout visibility update

The Stripe test payment symptom had two separate causes:

- In `STRIPE_MODE=test/live`, Checkout success does not add campaign budget inline. Budget only appears after `checkout.session.completed` reaches `/api/webhooks/stripe` and is written to the same storage namespace that `/api/market` and the advertiser dashboard read.
- The homepage previously ignored Stripe's returned `checkout_session_id`, so the advertiser could not tell whether the payment was webhook-pending, funded but private, unknown, or errored.

Implemented traceability:

- `/api/advertiser-checkout` and `/api/funds/checkout` success URLs now include `checkout_session_id={CHECKOUT_SESSION_ID}`.
- `budgetFunded` activity records now preserve the Stripe Checkout Session id.
- `GET /api/checkout-status?checkout_session_id=cs_...` reports `unknown`, `pending_webhook`, or `funded`, plus public leaderboard eligibility.
- The homepage now mounts `CheckoutStatusBanner` near the top of `#bid-market`, so a successful Stripe return shows a visible status explanation instead of silently looking broken.
- The advertiser dashboard now mounts the same status banner below its hero and the parser accepts `funding=success|cancelled`, so Add Funds redirects to `/dashboard/advertiser?funding=success&checkout_session_id=cs_...` get the same webhook/funding explanation.
- The banner now polls pending/unknown checkout states every 2 seconds for up to 15 attempts, so normal Stripe webhook latency can resolve from `pending_webhook` to `funded` without a manual refresh.

Verified:

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/checkout-status-banner.test.tsx src/app/page.test.tsx`
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/checkout-status-banner.test.tsx src/app/page.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx src/app/dashboard/advertiser/page.test.tsx src/app/api/checkout-status/route.test.ts src/app/api/funds/checkout/route.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/webhooks/stripe/route.test.ts src/app/api/market/route.test.ts`
- `corepack pnpm@9.12.0 --filter @spinshare/web lint`

Still blocked externally:

- Local end-to-end Stripe test still needs Stripe CLI on PATH and `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`.
- Firestore emulator testing still needs Java 11+; current local Java is 8.
- Verified full regression coverage after the UI update: `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint` both passed.
- Still not complete: the cumulative 3-second billing model now has core/web/CLI/extension focused coverage plus full root test/lint verification. Firestore namespace guard has focused unit verification, but real Firestore emulator write-through and real Claude Code manual verification are still pending.

## 2026-06-15 cumulative 3-second viewability update

- Core schema now accepts positive short view segments (`viewDurationMs >= 1`) while keeping `VIEWABILITY_MIN_MS = 3000` as the settlement threshold.
- Web now stores one pending impression-progress record per developer. `GET /api/ad` prefers that pending campaign for authenticated developers before normal bidding; `POST /api/track` returns `recorded:false` until cumulative duration reaches 3000 ms, then settles through the existing ledger path, records activity, and clears progress.
- CLI wrapper now reports short spinner/wait segments instead of discarding them. If an ad response includes `remainingViewDurationMs`, it schedules the report timer for the remaining time. Progress-only track responses update the cached pending ad; settled responses refresh the ad cache.
- VS Code extension ad controller now reports short completed generations and uses pending `remainingViewDurationMs` as the timer delay.
- Claude Code generated hook scripts now report positive short segments instead of dropping `< 3000 ms` views; the backend remains the source of truth for when cumulative 3000 ms settles.
- Focused verification passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`
  - `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-impression-progress-repository.test.ts src/server/bidding-service.test.ts src/app/api/ad/route.test.ts src/app/api/track/route.test.ts`
  - `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/api-client.test.ts src/wrap.test.ts`
  - `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/api-client.test.ts src/ad-controller.test.ts src/ad-controller.property.test.ts`
- Full root verification passed after the cumulative change: `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.
- Still not complete: Firestore namespace guard has focused unit verification, but real Firestore emulator write-through and real Claude Code TUI manual verification are still pending.

## 2026-06-15 Claude Code adapter cumulative/statusLine update

- Generated Claude hook script now requires a local token before fetching/showing an ad, preventing anonymous/free ad views that cannot be attributed.
- Generated Claude hook script now sends that token to `GET /api/ad`, so pending cumulative-progress campaigns can be selected for the authenticated developer before normal bidding.
- Generated Claude hook script now reports any positive viewed segment (`viewDurationMs >= 1`) to `/api/track`; it no longer drops segments below 3000 ms. This matches the cumulative backend model.
- Generated `statusLine` settings now include `refreshInterval: 1`, aligning with Claude Code's documented timer-based statusLine refresh support for time-based or externally sourced segments.
- The actual statusLine output now uses an ASCII `$ ` prefix for the ad text, avoiding the previous mojibake glyph in the generated display string.
- Generated hook/statusLine scripts now read Claude's stdin JSON and bind state to `session_id`, preventing stale state from another Claude session from being displayed or tracked.
- Focused verification passed:
  - `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/claude-code-adapter.test.ts`
  - `corepack pnpm@9.12.0 --filter ./vscode-extension test`
  - `corepack pnpm@9.12.0 --filter ./vscode-extension lint`
- Still pending: real Claude Code TUI verification for statusLine placement, refresh timing during thinking, OSC8 link behavior, and Windows shell path execution.

## 2026-06-15 npm CLI Claude Code setup update

- Added `cli-wrapper/src/claude-code-adapter.ts`, giving the npm CLI its own Claude Code hooks/statusLine installer instead of relying on the VS Code extension package.
- Added `spinshare setup claude-code` for explicit adapter installation.
- `spinshare login` now runs Claude Code setup best-effort after storing the token, so npm users do not need to manually wrap every Claude invocation with `spinshare claude`.
- Because the standalone generated Claude hook script reads the file credential path, CLI login now mirrors the token into `~/.config/spinshare/credentials.json` or `%APPDATA%/spinshare/credentials.json` even when the primary credential store is keytar.
- Focused verification passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts src/login.test.ts src/index.test.ts`
- Package verification passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/cli build`
  - `node "cli-wrapper/dist/index.js" --help`
- Still pending: real global npm install and real Claude Code TUI verification.

## 2026-06-15 advertiser money activity ledger update

- Advertiser activity is now a unified timeline, not only impression attempts.
- New advertiser event rows:
  - `checkoutStarted`: written when public homepage checkout or dashboard Add Funds creates a checkout session.
  - `budgetFunded`: written when mock/local checkout settles immediately, or when a real Stripe `checkout.session.completed` webhook is newly applied.
  - `budgetDebited`: written only for credited billable impressions; suppressed/duplicate/non-billed outcomes do not create debit rows.
- Stripe webhook activity is idempotent with the existing payment event claim. Duplicate webhook redelivery does not create duplicate budget or duplicate activity.
- Public homepage checkout and dashboard Add Funds both write local/mock money activity rows, so localhost testing can explain why a campaign gained budget.
- Advertiser activity API now preserves advertiser event fields (`amountCents`, `amountMicrocents`, `amountUsd`, `providerEventId`, `checkoutSessionId`) and still filters by direct owner id plus same-email public checkout id.
- Dashboard activity formatting now supports both impression attempts and advertiser money events in one recent activity feed.
- Verification passed:
  - Focused: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/activity/advertiser/route.test.ts src/app/api/webhooks/stripe/route.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts src/app/api/track/route.test.ts src/app/dashboard/activity-feed.test.ts`
  - Web full: `corepack pnpm@9.12.0 --filter @spinshare/web test`
  - Root full: `corepack pnpm@9.12.0 test`
  - Root typecheck/lint: `corepack pnpm@9.12.0 lint`
- Firestore namespace guard has focused unit verification, but real Firestore emulator write-through and real Claude Code TUI manual verification remain pending.

## 2026-06-15 activity ledger pagination update

- `GET /api/activity/developer` and `GET /api/activity/advertiser` now return bounded newest-first pages instead of unbounded arrays.
- Both routes support `limit` and `cursor` query parameters and include `nextCursor` when another page exists.
- Pagination is route-level for now because the repository interface still exposes full-list reads; if activity volume grows, the same API contract should be pushed down into Firestore queries.
- Focused verification passed: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/activity/developer/route.test.ts src/app/api/activity/advertiser/route.test.ts`.
- Full regression passed after the pagination update: `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.
- Remaining product work: dashboard UI still needs detail drill-down views and
  clearer status explanations. Load-more, filtering/search, and CSV export are
  already implemented for the current advertiser/developer activity surfaces.

## 2026-06-16 advertiser dashboard claim fix

- Root cause for “I paid on the homepage but do not see the campaign in advertiser dashboard”: homepage checkout stores ownership under `publicAdvertiserIdForEmail(purchaseEmail)`, but `/dashboard/advertiser/page.tsx` minted the dashboard bearer token with only `userId`.
- `/api/campaigns` already knew how to claim same-email public checkout campaigns, but that branch never ran when the dashboard token lacked `email`.
- Fix: advertiser dashboard token minting now includes `session.user.email` plus `role: "advertiser"`; `NextAuthDeviceProvider.mintToken()` now preserves optional claims, matching the mock provider behavior.
- Focused RED/GREEN verification passed: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/page.test.tsx src/server/adapters/auth/nextauth-device-provider.test.ts src/app/api/campaigns/route.test.ts`.
- Full regression passed after the fix: `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.
- Separate leaderboard diagnosis: homepage checkout defaults `publicOnLeaderboard=true`, but `/api/market` only shows campaigns with `budgetCents > 0`. In Stripe test/live mode, budget becomes positive only after the Stripe webhook is delivered and accepted.
- Current local external preflight still fails: `stripe` is not on PATH and Java is `1.8.0_491`, so local Stripe webhook forwarding and Firestore emulator write-through are not yet externally verified.

## 2026-06-16 checkout return session context update

- Public homepage checkout and dashboard funding success URLs now include `checkout_session_id={CHECKOUT_SESSION_ID}`.
- Real Stripe will substitute the Checkout Session id on hosted checkout completion; the mock gateway now simulates the same substitution locally.
- This does not replace the webhook requirement for funding. It preserves the session context needed for pending-payment diagnostics, future post-checkout UI, and manual support/debugging when a campaign is not funded.
- Focused RED/GREEN verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-adapters.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts`.
- Full regression passed after the update: `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## 2026-06-15 local Firestore isolation update

- `SPINSHARE_FIRESTORE_NAMESPACE=test` routes every Firestore collection path under `namespaces/test/...`, including `impressionActivities`, `impressionProgress`, and `paymentEvents`.
- `SPINSHARE_MODE=local` + `SPINSHARE_USE_FIRESTORE=1` + no `FIRESTORE_EMULATOR_HOST` now fails fast unless `SPINSHARE_FIRESTORE_NAMESPACE` is set. This prevents localhost from mutating top-level cloud Firestore collections.
- Firestore emulator usage remains allowed without a namespace because `FIRESTORE_EMULATOR_HOST` already isolates writes to the local emulator.
- Focused verification passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/container.test.ts src/server/adapters/firestore/collections.test.ts`
- Still pending: a real emulator process write-through test and the Stripe CLI webhook end-to-end run.

## 2026-06-15 install/sign-in, statusLine ad polish, and URL safety update

- Fresh extension installs now have a persistent status bar sign-in entry:
  `$(account) SpinShare Sign in`. It appears when no token is stored, runs
  `spinshare.signIn`, hides after successful sign-in, and returns after
  sign-out. The automatic activation prompt remains, but the user no longer has
  only one easy-to-miss modal prompt.
- Generated Claude Code statusLine ads are now bold cyan and still wrapped in
  OSC8 hyperlinks when `destinationUrl` exists. This makes the visible ad more
  attention-grabbing while preserving click-through behavior in terminals that
  support OSC8 links.
- Claude Code controls statusLine placement. SpinShare can style and link the
  statusLine text, but it cannot force the ad to render directly under the
  `Thinking...` row through this API. That placement needs real Claude Code TUI
  verification or a different host surface.
- Destination URL safety now has a deterministic first gate in
  `@spinshare/core`: campaign URLs must be HTTPS public domains. URLs with
  username/password credentials, localhost/.local hosts, IP literals, or custom
  ports are rejected before public checkout or dashboard campaign creation.
- The click redirect endpoint now reuses that same safety gate. This closes a
  historical-data gap: an old or manually inserted campaign with an unsafe
  HTTPS-looking destination such as `https://localhost/` now falls back to the
  site root and does not increment click telemetry.
- Root `test` and `lint` now rebuild `@spinshare/core` before running consumer
  packages. This matters because web/CLI/extension imports resolve core through
  `packages/core/dist`; without the build step, consumer tests can accidentally
  run against stale schemas and produce false confidence.
- LLM review should be a second layer, not the first line of defense. A later
  review service can call OpenRouter/Gemma or another provider for ad copy and
  landing-page checks, but deterministic URL policy and reputation checks should
  run before any model judgment.
- Focused verification passed:
  - `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/extension.test.ts`
  - `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/claude-code-adapter.test.ts`
  - `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts`
  - `corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`
  - `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/click/route.test.ts`
- Full regression passed after this update:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`
  - `corepack pnpm@9.12.0 --filter ./vscode-extension package`
- `git diff --check` still reports pre-existing unrelated whitespace in
  `web/src/app/page.tsx`, `web/src/app/home.css`, and
  `.ai/web/src/app/api/track/route.test.md`; the files touched by this update
  pass path-scoped diff check.

## 2026-06-15 dashboard block-purchase funding update

- Advertiser dashboard funding now matches the product model: campaigns are
  funded by buying 1,000-view blocks, not by typing arbitrary USD top-up
  amounts.
- `@spinshare/core` now exports `fundingBlockCheckoutSchema` for
  `{ campaignId, blockCount }`. It shares the same whole positive block-count
  validation as public homepage checkout.
- `POST /api/funds/checkout` now rejects legacy amount-only dashboard payloads.
  It loads the owned campaign, computes checkout amount as
  `campaign.cpmCents * blockCount`, rejects derived totals above $100,000, then
  records checkout/funding activity with that derived amount.
- `CampaignList` now presents the control as "Buy blocks", explains that one
  block equals 1,000 impressions, validates whole block counts, and sends
  `blockCount` to `/api/funds/checkout`.
- Focused verification passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`
  - `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/funds/checkout/route.test.ts src/app/dashboard/advertiser/lib.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx`
- Full regression passed after this update:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`

## 2026-06-15 Claude direct-launch boundary update

- The VS Code/Cursor/Trae terminal shim no longer routes `claude` through the old `spinshare claude` stdout/spinner wrapper.
- Generated terminal launchers now treat `claude` as a native adapter agent: they remove the shim directory from `PATH`, set SpinShare base URL env vars, and launch the real `claude` directly with inherited stdio.
- Non-native configured agents still use the SpinShare CLI wrapper fallback, so the old wrapper remains available for future tools that do not expose lifecycle/status APIs.
- This aligns the MVP boundary with the product decision: Claude Code ads come from official hooks/statusLine, while shim logic only provides no-touch startup.
- The generated VS Code Claude statusLine script no longer contains the unused non-ASCII `▣ ` marker; generated visible ad text uses the ASCII `$ ` prefix.
- Focused verification passed:
  - `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/terminal-auto-wrap.test.ts`
  - `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/claude-code-adapter.test.ts`
- Still pending: real Claude Code TUI verification after extension activation, including statusLine placement, hook firing, OSC8 link rendering, and Windows shell behavior.

## 2026-06-15 generated Claude script runtime verification update

- Added execution-level tests for both VS Code extension and npm CLI Claude Code adapters.
- The tests write generated `spinshare-hook.cjs` and `spinshare-statusline.cjs` scripts to temp directories and execute them with real Node child processes.
- A local HTTP server simulates `/api/ad` and `/api/track`, proving the generated scripts send bearer Authorization, persist ad state, display `$ <adText>` only for the matching `session_id`, post a positive `viewDurationMs` on `Stop`, and clear state afterward.
- Focused verification passed:
  - `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/claude-code-adapter.test.ts`
  - `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts`
- Full regression after adding runtime smoke tests passed:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`
  - `git diff --check` (only CRLF warnings, no whitespace errors)
- This still does not replace real Claude Code TUI testing; it narrows the remaining risk to Claude's actual hook/statusLine invocation and terminal rendering behavior.

## 2026-06-15 duplicate Claude adapter cleanup update

- New bug found during the client architecture audit: if a user installs both the VS Code/Cursor/Trae extension adapter and the npm CLI adapter, both can patch the same `~/.claude/settings.json` with different generated script paths.
- Previous behavior only deduplicated the exact current hook command. That meant an old SpinShare `spinshare-hook.cjs` command from the other installer path could remain active, while `statusLine` pointed at only the newest installer. Risk: one Claude turn could fetch/report ads twice, including a report for an ad surface the user did not see.
- Fixed both adapter implementations so generated SpinShare commands are identified by owned script names (`spinshare-hook.cjs`, `spinshare-statusline.cjs`) instead of the exact directory. Merge now removes old SpinShare-owned hooks before adding the current plan. Removal deletes all SpinShare-owned hook/statusLine entries while preserving unrelated user hooks/settings.
- RED/GREEN verification passed:
  - RED before implementation: both focused tests failed on stale hook/statusLine cleanup.
  - GREEN after implementation: `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/claude-code-adapter.test.ts` passed.
  - GREEN after implementation: `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts` passed.
- Full regression and publish/package checks passed after the cleanup:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`
  - `corepack pnpm@9.12.0 --filter ./vscode-extension package`
  - `npm.cmd publish --dry-run` with a workspace-local npm cache
  - `git diff --check` reported only CRLF warnings, no whitespace errors.
- Compiled/package artifact spot check passed: `vscode-extension/out/claude-code-adapter.js`, `cli-wrapper/dist/index.js`, and `vscode-extension/cli-wrapper/dist/index.js` contain the SpinShare-owned command cleanup.
- `corepack pnpm@9.12.0 verify:local-runtime` still exits 1 for external dependencies only: `stripe` is not on `PATH`, and Java is `1.8.0_491` while the Firestore emulator requires Java 11+.
- Still pending: real Claude Code TUI verification and external Stripe CLI / Firestore emulator end-to-end verification after installing Stripe CLI and JDK 21.

## 2026-06-15 same-session Claude stale state update

- New client bug found after the duplicate-hook cleanup: generated Claude hooks returned early whenever active ad state matched the current `session_id`. That correctly deduped repeated `MessageDisplay` events in one turn, but it was wrong for a new `UserPromptSubmit` in the same Claude session after a missed/failed `Stop` hook.
- Previous risk: stale active state from an old turn could make the next prompt skip `/api/ad`, keep the old campaign and old `startedAtMs`, then report the old campaign when the next `Stop` eventually fired. That would pollute activity ledger rows and could credit a stale surface instead of the freshly displayed one.
- Fixed both generated hook templates: `UserPromptSubmit` is now treated as the start of a new turn and clears any existing active state before fetching a fresh ad. `MessageDisplay` still returns early for a matching active state, so the same turn does not double-fetch.
- RED/GREEN runtime verification passed:
  - RED before implementation: extension and CLI generated-script tests failed because the second same-session `UserPromptSubmit` did not call `/api/ad` again.
  - GREEN after implementation: `corepack pnpm@9.12.0 test -- src/claude-code-adapter.test.ts` from `vscode-extension/` passed.
  - GREEN after implementation: `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts` passed.
- Full regression and publish/package checks passed after the stale-state fix:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`
  - `corepack pnpm@9.12.0 --filter ./vscode-extension package`
  - `npm.cmd publish --dry-run` with a workspace-local npm cache
  - `git diff --check` reported only CRLF warnings, no whitespace errors.
- Compiled/package artifact spot check passed: `vscode-extension/out/claude-code-adapter.js`, `cli-wrapper/dist/index.js`, and `vscode-extension/cli-wrapper/dist/index.js` contain the `isPromptStart` / `isDisplayEvent` branch.
- `corepack pnpm@9.12.0 verify:local-runtime` still exits 1 for external dependencies only: `stripe` is not on `PATH`, and Java is `1.8.0_491` while the Firestore emulator requires Java 11+.

## 2026-06-15 extension existing-token mirror sync update

- New account-sync bug found in the VS Code/Cursor/Trae path: Claude Code generated hooks cannot read VS Code SecretStorage. The extension already mirrored tokens on fresh sign-in, but an existing signed-in extension user could have a token only in SecretStorage after upgrade/restart.
- Previous risk: extension activation installs the Claude Code adapter, but generated hook scripts find no CLI-compatible file credential, so `/api/ad` is never fetched with bearer auth until the user signs in again. That violates the desired "download extension/npm, login once, account syncs" UX.
- Fixed `AuthManager.initialize()`: when it loads a non-empty token from SecretStorage, it best-effort saves the same token through the configured `FileTokenMirror`. If SecretStorage has no token, initialize intentionally does not clear the shared file credential because it may belong to a separate npm CLI login.
- RED/GREEN verification passed:
  - RED before implementation: `corepack pnpm@9.12.0 test -- src/auth.test.ts` from `vscode-extension/` failed because the existing token was not mirrored.
  - GREEN after implementation: the same focused test passed with 10 auth tests.
- Full regression and publish/package checks passed after the mirror-sync fix:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`
  - `corepack pnpm@9.12.0 --filter ./vscode-extension package`
  - `npm.cmd publish --dry-run` with a workspace-local npm cache
  - `git diff --check` reported only CRLF warnings, no whitespace errors.
- Compiled/package artifact spot check passed: `vscode-extension/out/auth.js` contains the `tokenMirror?.save(this.cachedToken)` call inside `initialize()`.
- `corepack pnpm@9.12.0 verify:local-runtime` still exits 1 for external dependencies only: `stripe` is not on `PATH`, and Java is `1.8.0_491` while the Firestore emulator requires Java 11+.

## 2026-06-15 legacy CLI authenticated ad fetch update

- New fallback-wrapper billing safety bug found: `CliApiClient.getAd()` could call the public `/api/ad` endpoint without a bearer token.
- Previous risk: the old generic stdout/spinner wrapper could display an anonymous ad, then fail `/api/track` because there was no developer token. That gives advertisers an unattributed/free ad view and violates the account-sync model.
- Fixed `CliApiClient.getAd()`: when no token is available, it returns `{ adAvailable: false }` immediately and does not call `fetch`. Device login endpoints remain unauthenticated.
- RED/GREEN verification passed:
  - RED before implementation: `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/api-client.test.ts` failed because anonymous `getAd()` returned a real ad.
  - GREEN after implementation: the same focused CLI API client test passed with 16 tests.
- Full follow-up verification passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/cli test`
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`
  - `corepack pnpm@9.12.0 --filter ./vscode-extension package`
  - `npm.cmd publish --dry-run` with a workspace-local npm cache
  - `git diff --check` reported only CRLF warnings, no whitespace errors.
- Packaged artifact spot check passed: both `cli-wrapper/dist/index.js` and `vscode-extension/cli-wrapper/dist/index.js` contain the `!headers.Authorization` guard before `/api/ad`.
- `corepack pnpm@9.12.0 verify:local-runtime` still exits 1 for external dependencies only: `stripe` is not on `PATH`, and Java is `1.8.0_491` while the Firestore emulator requires Java 11+.

## 2026-06-15 backend ad-serving auth boundary update

- New API boundary bug found after the client token gate: `/api/ad` itself still allowed missing or invalid bearer tokens to enter normal bidding.
- Previous risk: any custom or stale client could fetch a paid campaign anonymously. Even if `/api/track` later rejected settlement, the advertiser could receive free, unattributed exposure and campaign `shows` telemetry could be inflated.
- Fixed `web/src/app/api/ad/route.ts`: missing or invalid bearer tokens now return `401 { "error": "Unauthorized" }` before bidding, pending-progress selection, click URL rewriting, or `shows` telemetry.
- RED/GREEN verification passed:
  - RED before implementation: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/ad/route.test.ts` failed because missing/invalid tokens returned `200`.
  - GREEN after implementation: the same focused ad route test passed with 4 tests.
- Full web regression passed: `corepack pnpm@9.12.0 --filter @spinshare/web test` passed with 186 tests and 1 skipped emulator integration.
- Full root regression and lint/typecheck passed after the boundary change:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`

## 2026-06-15 extension ad-fetch token gate update

- Follow-up client boundary fix: the VS Code/Cursor/Trae `AdApiClient.getAd()` no longer calls `/api/ad` unless it has either a constructor token or a per-call token.
- Previous risk after the backend auth change: no free ad could be returned, but manual extension command paths could still produce unauthenticated 401 request noise.
- Fixed `vscode-extension/src/api-client.ts`: missing token returns `{ adAvailable: false }` without calling `fetch`; device-flow login endpoints remain unauthenticated.
- RED/GREEN verification passed:
  - RED before implementation: `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/api-client.test.ts` failed because anonymous `getAd()` returned a stubbed ad.
  - GREEN after implementation: the same focused API client test passed with 9 tests.
- Full verification passed:
  - `corepack pnpm@9.12.0 --filter ./vscode-extension test`
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`
  - `corepack pnpm@9.12.0 --filter ./vscode-extension package` (passed on retry after a transient Windows `EBUSY` lock on the old VSIX)
- Compiled/package artifact spot check passed: `vscode-extension/out/api-client.js` and `vscode-extension/cli-wrapper/dist/index.js` both contain their `/api/ad` Authorization guards.

## 2026-06-15 served-marker track validation update

- New ledger safety bug found: `/api/track` validated the developer token and campaign budget, but it did not prove that `/api/ad` had actually served that campaign to that developer.
- Previous risk: an authenticated developer could POST an arbitrary funded `campaignId` with `viewDurationMs >= 3000` and drain advertiser budget without receiving that ad from bidding.
- Fixed the boundary using the existing progress repository:
  - authenticated `/api/ad` writes a 0ms pending progress marker for the selected developer/campaign before `shows`;
  - `/api/track` requires an existing marker for the same developer/campaign before adding duration or calling `recordImpression`;
  - missing/mismatched marker returns the existing `422 invalid_or_insufficient_campaign`, records invalid-campaign activity/telemetry, and does not mutate ledger.
- RED/GREEN verification passed:
  - RED before implementation: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/ad/route.test.ts src/app/api/track/route.test.ts` failed because `/api/ad` left no marker and `/api/track` accepted unserved campaigns.
  - GREEN after implementation: the same focused route test passed with 10 tests.
- Full verification passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/web test`
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`

## 2026-06-16 same-email public campaign funding update

- New dashboard funding bug found in the homepage purchase model: homepage
  checkout campaigns are owned by `publicAdvertiserIdForEmail(email)`, while
  dashboard Add Funds authorized only `claims.userId`.
- Previous risk: after the dashboard claim fix, a same-email homepage campaign
  could be visible in the advertiser dashboard but still return `403` when the
  advertiser tried to buy more blocks from the dashboard.
- Fixed `web/src/app/api/funds/checkout/route.ts`: the route now authorizes an
  existing campaign when its owner matches either the authenticated
  `claims.userId` or `publicAdvertiserIdForEmail(claims.email)`.
- This does not change the real Stripe settlement rule. In `STRIPE_MODE=test`
  or `live`, a paid checkout still reaches the leaderboard only after
  `POST /api/webhooks/stripe` receives `checkout.session.completed` and applies
  budget. `/api/market` still lists only campaigns with `budgetCents > 0`.
- RED/GREEN verification passed:
  - RED before implementation: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/funds/checkout/route.test.ts` failed with `403` for a same-email homepage campaign.
  - GREEN after implementation: the same focused test passed with 6 tests.
- Related dashboard/claim regression passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/funds/checkout/route.test.ts src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/page.test.tsx`
- Full regression/typecheck passed after the final workspace state:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`
  - path-scoped `git diff --check` passed for the files touched in this
    investigation; it reported only CRLF conversion warnings.
- Real external checkout verification is still blocked locally until Stripe CLI
  is available on `PATH` and the Firestore emulator Java dependency is upgraded
  from `1.8.0_491` to Java 11+.

## 2026-06-16 Stripe webhook funding hardening update

- New webhook risk found in the paid-checkout visibility path: the route claimed
  the Stripe event id before proving that the campaign still existed. If budget
  application then failed, a payment event could be marked applied while the
  campaign stayed at `budgetCents=0`, which keeps it off `/api/market`.
- Fixed `web/src/app/api/webhooks/stripe/route.ts`: funding events are now
  validated before idempotency claim. Empty campaign ids or non-positive amounts
  are ignored without mutation; missing campaigns return a retryable `500` and
  do not mark the event as applied.
- Added Checkout Session traceability: `StripeEvent` now carries optional
  `checkoutSessionId`, `StripeGateway` parses `session.id`, the mock gateway
  preserves it in signed payloads, and `budgetFunded` activity records it. This
  connects `checkout_session_id=cs_...` from the success URL to the eventual
  funding activity row.
- RED/GREEN focused verification passed:
  - RED: webhook route test failed because missing campaign threw after event
    claim, and funded activity lacked `checkoutSessionId`.
  - GREEN: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/webhooks/stripe/route.test.ts src/server/adapters/stripe/stripe-gateway.test.ts`
- Related payment/market/activity regression passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/webhooks/stripe/route.test.ts src/app/api/webhooks/stripe/payment.property.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts src/app/api/market/route.test.ts src/app/api/activity/advertiser/route.test.ts src/server/adapters/stripe/stripe-gateway.test.ts`
- Full regression/typecheck passed:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`
- This still does not replace real webhook delivery: Stripe test/live checkout
  must still deliver `checkout.session.completed` to the same environment that
  stores the campaign.

## 2026-06-16 checkout status diagnostics update

- New observability gap found: homepage and dashboard success URLs now carry
  `checkout_session_id=cs_...`, but there was no API to resolve that id back to
  local SpinShare state. Users could pay successfully and still see no clear
  answer about whether SpinShare was waiting for the webhook or had funded the
  campaign.
- Added `ActivityRepository.listByCheckoutSessionId(sessionId)` to resolve
  advertiser activity rows by Checkout Session id. Memory and Firestore
  adapters implement it and return only advertiser events.
- Added public low-information endpoint
  `GET /api/checkout-status?checkout_session_id=cs_...`:
  - `400` for missing/malformed session ids;
  - `404 { status: "unknown" }` when SpinShare has no checkout activity;
  - `200 { status: "pending_webhook", campaign }` when checkout was created but
    no budget-funded event exists;
  - `200 { status: "funded", campaign }` when budget funding activity exists.
- The campaign payload intentionally excludes contact email and identity data.
  It includes only id, budget cents, public leaderboard flag, biddable flag, and
  leaderboard eligibility.
- RED/GREEN focused verification passed:
  - RED: checkout-status route missing and memory activity repo had no
    `listByCheckoutSessionId()`.
  - GREEN: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/checkout-status/route.test.ts src/server/adapters/memory/memory-activity-repository.test.ts`.
- Related checkout/payment/market regression passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/checkout-status/route.test.ts src/server/adapters/memory/memory-activity-repository.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts src/app/api/webhooks/stripe/route.test.ts src/app/api/activity/advertiser/route.test.ts src/app/api/market/route.test.ts`
- Full regression/typecheck passed:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`

## 2026-06-16 exact local Stripe test diagnosis

- Current local `.env` is the problematic hybrid mode:
  `SPINSHARE_MODE=local`, `AUTH_MODE=oauth`, `STRIPE_MODE=test`, no
  `SPINSHARE_USE_FIRESTORE=1`, no `FIRESTORE_EMULATOR_HOST`, and no
  `SPINSHARE_FIRESTORE_NAMESPACE`.
- With that configuration, the app creates homepage checkout campaigns in the
  process-local memory repository, while Stripe Checkout is real test mode.
  The campaign starts at `budgetCents=0` and is not biddable until the Stripe
  webhook reaches the same running Next.js process.
- `/api/market` intentionally shows only campaigns from
  `campaigns.listBiddable()`, which means `budgetCents > 0` and `cpmCents > 0`.
  A paid Checkout Session that has not been webhook-funded will not appear on
  the leaderboard.
- `/dashboard/advertiser` now mints its bearer token with `session.user.email`,
  so same-email homepage purchases can be claimed. If a purchase still does not
  appear there, the likely causes are: the paid campaign was only in memory and
  the dev server restarted; the dashboard login email differs from the checkout
  email; or the purchase happened in a different environment/namespace than the
  dashboard is reading.
- Required local verification loop for real Stripe test:
  1. install Stripe CLI and run
     `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`;
  2. copy the CLI-provided `whsec_...` into `STRIPE_WEBHOOK_SECRET`;
  3. choose one storage mode and keep all reads/writes there:
     `STRIPE_MODE=mock` for pure local, Firestore emulator, or
     `SPINSHARE_USE_FIRESTORE=1` with `SPINSHARE_FIRESTORE_NAMESPACE=test`;
  4. after checkout, call
     `/api/checkout-status?checkout_session_id=cs_...` and verify it moves from
     `pending_webhook` to `funded`.
- Current preflight result on 2026-06-16:
  `corepack pnpm@9.12.0 verify:local-runtime` fails because `stripe` is not on
  `PATH` and Java is `1.8.0_491`; it also reports
  `env.local.firestoreIsolation: local Firestore is not enabled`.

## 2026-06-16 advertiser activity load-more UI update

- The advertiser activity APIs already returned bounded pages with `nextCursor`,
  but the dashboard context previously discarded the cursor and the UI had no
  way to request older rows.
- `AdvertiserDashboardProviderClient` now preserves `nextCursor`, exposes
  `loadMoreActivity()`, and appends de-duplicated older rows through the pure
  `mergeActivityRows()` helper.
- `AdvertiserActivityFeed` now renders a compact load-more button, keeps already
  loaded ledger rows visible while another page is loading, and shows inline
  load-more errors without replacing the feed.
- Focused verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx`.

## 2026-06-16 advertiser activity filter/export update

- The advertiser activity feed now has first-pass ledger controls:
  search, all/billable/no-charge/payment filters, and CSV export for the
  currently visible rows.
- `filterAdvertiserActivityRows()` keeps filtering testable outside the browser.
  Search normalizes punctuation and underscores, so human queries such as
  `no charge` can match ids like `cmp_no_charge`.
- `advertiserActivityRowsToCsv()` emits stable columns:
  `activityId,campaignId,status,duration,amount,createdAtMs`.
- Focused RED/GREEN verification:
  - RED: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx` failed because the filter/CSV helpers did not exist.
  - GREEN: the same focused test passed with 6 tests.
- Typecheck verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.

## 2026-06-16 developer activity filter/export update

- The developer activity page now exports the currently visible ledger rows as
  CSV, matching the advertiser-side visibility work.
- `filterDeveloperActivityRows()` extracts the existing search behavior into a
  testable helper and normalizes punctuation/underscores, so queries like
  `no charge` can match campaign ids such as `cmp_no_charge`.
- `developerActivityRowsToCsv()` emits stable columns:
  `activityId,campaignId,status,duration,credit,createdAtMs`.
- Focused RED/GREEN verification:
  - RED: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/developer-activity-view.test.tsx` failed because the filter/CSV helpers did not exist.
  - GREEN: the same focused test passed with 2 tests.
- Related activity verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/developer-activity-view.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts src/app/api/activity/developer/route.test.ts src/app/api/activity/advertiser/route.test.ts`.
- Full regression/typecheck passed after this update:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## 2026-06-16 extension prod/local packaging update

- Root cause for "extension suddenly has no ads" is likely environment/auth, not
  the absence of all ad logic:
  - `/api/ad` now requires a valid bearer token, so unsigned extension/Claude
    hooks intentionally receive no ads.
  - Local sample campaigns are no longer seeded by default; localhost must run
    with `SPINSHARE_SEED_LOCAL_DATA=1`.
  - The packaged extension defaulted to production unless the user manually set
    `spinshare.baseUrl`, so local testing could silently point at the wrong API.
- Added `corepack pnpm@9.12.0 dev:sample` at repo root. It starts web dev with
  local mock auth/payment, memory storage, and seeded sample ads.
- Added VSIX package variants:
  - `corepack pnpm@9.12.0 --filter ./vscode-extension package:prod` produces
    `vscode-extension/spinshare-prod-0.2.0.vsix`, defaulting to
    `https://spinshare-web-vert.vercel.app`.
  - `corepack pnpm@9.12.0 --filter ./vscode-extension package:local` produces
    `vscode-extension/spinshare-local-0.2.0.vsix`, display name
    `SpinShare Local`, defaulting to `http://localhost:3000`.
  - `package:all` builds both.
- Intentional design choice: both artifacts keep the same extension id for now.
  Installing local replaces prod instead of running both simultaneously, which
  avoids duplicate command ids, terminal shims, and Claude Code adapter
  ownership conflicts.
- Follow-up auth fix: extension SecretStorage tokens are now scoped by
  normalized `spinshare.baseUrl`. The local VSIX will not reuse a production
  token, while the production VSIX migrates the old legacy token key so existing
  prod users are not signed out on upgrade.
- Verification:
  - RED/GREEN focused tests passed for `web/scripts/dev-local-sample.test.mjs`
    and `vscode-extension/scripts/package-variant.test.mjs`.
  - `corepack pnpm@9.12.0 package:all` passed from `vscode-extension/` and
    generated both VSIX files.
  - VSIX manifest inspection passed: prod package has display name `SpinShare`
    and base URL `https://spinshare-web-vert.vercel.app`; local package has display name
    `SpinShare Local` and base URL `http://localhost:3000`.
  - VSIX compiled artifact inspection passed: local package includes
    `tokenSecretKeyForBaseUrl` and activation passes scoped token keys.
  - Full regression/typecheck passed after this update:
    `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## 2026-06-16 developer activity load-more UI update

- The developer activity API already returned bounded newest-first pages with
  `nextCursor`, but the dashboard previously loaded all activity server-side
  in `layout.tsx` via `container.activities.listByDeveloper(developerId)` and
  had no client-side fetch or load-more control.
- Added `web/src/app/dashboard/developer/developer-activity-context.tsx`:
  `DeveloperActivityProviderClient` fetches `/api/activity/developer` on mount,
  preserves `nextCursor`, exposes `loadMoreActivity()`, and merges pages through
  the pure `mergeDeveloperActivityRows()` helper (mirrors the advertiser-side
  pattern).
- `web/src/app/dashboard/developer/layout.tsx` now mints a developer bearer
  token (with `email` and `role: "developer"` claims, matching the advertiser
  layout's token shape) and wraps the shell in `DeveloperActivityProviderClient`.
  Server-side ledger reads for `summary` are unchanged; only activity data moved
  to client-side fetch.
- `DeveloperActivityView` now reads from `useDeveloperActivity()` and renders a
  load-more button when `nextCursor` is present, keeps existing rows visible
  while a later page is loading, and shows inline load-more errors.
- Added i18n keys `developerDashboard.activityLoading`, `loadMoreActivity`,
  `loadingMoreActivity`, `activityLoadMoreError` across English, Chinese, and
  French dictionaries.
- Focused verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/developer-activity-context.test.ts src/app/dashboard/developer/developer-activity-view.test.tsx src/app/dashboard/developer/developer-activity-view-render.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx`.
- Full regression/typecheck passed after this update:
  `corepack pnpm@9.12.0 test` (227 passed, 1 skipped) and
  `corepack pnpm@9.12.0 lint`.
- Remaining developer-side product work: detail views and stronger
  explanationary status labels (matches the advertiser-side remaining work).

## 2026-06-16 activity ledger detail disclosure update

- Added shared pure ledger formatting helper
  `activityDetailItems(row, { amountLabel })`.
- Advertiser activity rows now include an inline `Details` disclosure showing:
  activity id, campaign id, status, event/duration, amount, created timestamp,
  and optional Stripe checkout/provider ids.
- Developer mobile activity cards and desktop activity table now expose the same
  audit details, using `Credit` as the amount label.
- This closes the first-pass activity-ledger auditability gap without changing
  any backend API shape.
- RED/GREEN verification:
  - RED before implementation:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx`
    failed because `activityDetailItems` and UI disclosures did not exist.
  - GREEN after implementation: the same focused command passed with 15 tests.
  - Typecheck passed:
    `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- External verification status remains unchanged:
  `corepack pnpm@9.12.0 verify:local-runtime` still fails locally because
  `stripe` is not on PATH and Java is `1.8.0_491`, so real Stripe webhook
  forwarding and Firestore emulator write-through are still not locally proven.

## 2026-06-16 deterministic ad text safety gate update

- Added `reviewAdTextSafety(adText)` in `@spinshare/core` and wired it into the
  shared `adTextSchema`.
- This is a deterministic first-pass safety gate, not an LLM replacement. It
  blocks clearly unsafe/deceptive copy before campaign creation or payment:
  seed phrase/private key collection, password/OTP collection, crypto
  giveaway/airdrop lures, and wallet/account/login verification lures.
- Public homepage checkout and authenticated dashboard campaign creation both
  inherit the same rule through core schemas.
- Route behavior now rejects unsafe ad copy with the existing `400` validation
  response before storing a campaign, creating Stripe Checkout, or writing
  checkout activity.
- Narrowness check: ordinary security-tool copy such as password-manager
  training remains allowed.
- RED/GREEN verification:
  - RED before implementation:
    `corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`
    failed because unsafe copy was accepted and `reviewAdTextSafety` did not
    exist.
  - RED route coverage:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/advertiser-checkout/route.test.ts src/app/api/campaigns/route.test.ts`
    failed because public checkout returned `200` and authenticated creation
    returned `201`.
  - GREEN after implementation:
    `corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`
    passed.
  - After rebuilding core, the focused web route tests passed.
- Remaining safety work: add the actual async reviewer/reputation worker for
  landing-page content and borderline ad copy. OpenRouter/Gemma can be a
  second-pass reviewer, but the synchronous checkout path should not depend
  solely on an LLM.

## 2026-06-16 campaign review status and biddability gate

Root cause:

- Deterministic ad text and URL gates rejected obvious unsafe input, but the
  campaign model had no durable safety-review state.
- Without a review state, an async LLM/reputation/manual reviewer would have no
  clean way to quarantine a funded campaign while review was pending or after it
  was rejected.

Implemented fix:

- Added `CampaignReviewStatus = "approved" | "pending" | "rejected"` and
  optional `Campaign.reviewStatus`.
- Campaign creation defaults `reviewStatus` to `approved`, preserving existing
  public checkout/dashboard behavior after the synchronous deterministic gates.
- Firestore `toCampaign()` maps missing/unknown legacy values to `approved`.
- Memory and Firestore campaign repositories now filter `listBiddable()` to
  approved campaigns only.
- Added `CampaignRepository.updateReviewStatus(id, reviewStatus)` so future
  LLM/manual review can move campaigns between pending, approved, and rejected.

Verification:

- RED:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/bidding-service.test.ts`
  failed because a high-CPM `pending` campaign won bidding.
- RED:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-adapters.test.ts`
  failed because `updateReviewStatus()` did not exist.
- GREEN focused verification:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-adapters.test.ts src/server/bidding-service.test.ts src/app/api/market/route.test.ts`
  passed 3 files / 26 tests.
- Core build passed:
  `corepack pnpm@9.12.0 --filter @spinshare/core build`.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- Web full regression passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test` with 61 files passed, 1
  skipped; 282 tests passed, 1 skipped.
- Root regression passed:
  `corepack pnpm@9.12.0 test`
  - core: 5 files / 39 tests; core build passed.
  - web: 61 files passed, 1 skipped; 282 tests passed, 1 skipped.
  - cli: 12 files / 97 tests.
  - vscode-extension: 8 files / 67 tests.
- Root typecheck/lint passed:
  `corepack pnpm@9.12.0 lint`.

Remaining caveat:

- This is the review-state and biddability gate. The actual async review worker
  or admin review UI is still not implemented.

## 2026-06-16 extension activation sign-in prompt coverage

- Confirmed the extension activation path creates the persistent sign-in status
  bar item and also calls `AuthManager.ensureAuthenticated()` when no token is
  loaded. That means fresh installs are intended to prompt browser/device
  sign-in immediately, not only after a manual command.
- Added regression coverage in `vscode-extension/src/extension.test.ts` so this
  install-time sign-in contract is locked separately from the fallback status
  bar button.
- Focused verification passed:
  `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/extension.test.ts`.

## 2026-06-16 local sample dev launcher Windows fix

- Found a Windows-specific local testing bug: `dev:sample` used `corepack.cmd`
  but spawned it with `shell: false`. On Windows that can prevent the sample
  server from starting, which makes the local VSIX look like it has no ads.
- Added `devLocalSampleSpawnOptions(platform)` and wired
  `runLocalSampleDev()` to use `shell: true` on Windows and `shell: false`
  elsewhere.
- RED/GREEN verification passed:
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\dev-local-sample.test.mjs`
    failed because `devLocalSampleSpawnOptions` did not exist.
  - GREEN: the same focused command passed with 3 tests.

## 2026-06-16 local sample credentials sign-in fix

- Found a second localhost-only break in the extension sign-in path:
  `dev:sample` uses `AUTH_MODE=mock`, but `/activate` still requires a browser
  session and `/signin` was OAuth-only. Without Google/GitHub credentials, the
  local VSIX could open the browser but never approve the device code, so
  authenticated `/api/ad` returned no sample ads.
- Added a local-only credentials shortcut behind
  `NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS=1`. The UI uses the fixed local test
  accounts only:
  - developer: `developer@spinshare.test` / `spinshare`
  - advertiser: `advertiser@spinshare.test` / `spinshare`
- `dev:sample` now sets that `NEXT_PUBLIC_*` flag, so local VSIX testing has a
  complete sign-in path without OAuth credentials. Production remains OAuth-only
  by default.
- RED/GREEN verification passed:
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/signin/page.test.ts`
    failed because the local credentials helpers did not exist.
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\dev-local-sample.test.mjs`
    failed because the launcher did not set the public flag.
  - GREEN: both focused commands passed after implementation.

## 2026-06-16 LearnX local seed removal

- Replaced the explicit local seed campaign from LearnX to a clearly local
  sample:
  - `brandName: "SpinShare Local"`
  - `adText: "SpinShare Local - sample ad for localhost testing"`
  - `destinationUrl: "https://spinshare-web-vert.vercel.app"`
- The sample campaign is still default-off and only appears when
  `SPINSHARE_SEED_LOCAL_DATA=1`, which `dev:sample` sets for localhost testing.
- RED/GREEN verification passed:
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/container.test.ts`
    failed because the explicit seed still returned LearnX.
  - GREEN: the same focused command passed after replacing the seed data.

## 2026-06-16 local runtime preflight credentials warning

- Added `checkLocalCredentialsShortcut(env)` to
  `web/scripts/verify-local-runtime-core.mjs`.
- When `SPINSHARE_MODE=local` and `AUTH_MODE=mock`, preflight now warns if
  `NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS` is not `1`. That catches the exact
  local failure mode where `/activate` opens but `/signin` hides the local test
  account shortcut.
- The result is warning severity, so it diagnoses local sample auth without
  blocking unrelated checks.
- RED/GREEN verification passed:
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\verify-local-runtime.test.mjs`
    failed because the helper and aggregate check did not exist.
  - GREEN: the same focused command passed with 12 tests.

## 2026-06-16 Stripe checkout return reconciliation

- Root cause for "Stripe test paid but dashboard/leaderboard does not show":
  current `.env` is `SPINSHARE_MODE=local` + `STRIPE_MODE=test` while durable
  campaign/payment repos are still in memory. Real Stripe Checkout can succeed,
  but without `stripe listen` forwarding the webhook to the same localhost
  process, the campaign stays `budgetCents=0`; the market/leaderboard correctly
  filters it out as not biddable.
- Added a safe fallback to `GET /api/checkout-status`: when local checkout
  activity exists but funding is still pending, it retrieves the Stripe Checkout
  Session via the payment gateway and applies budget only if Stripe reports the
  same session as paid for the same campaign with a positive amount.
- The fallback and webhook now share the idempotency key
  `checkout_session:{sessionId}`, so a success-page reconciliation and a later
  Stripe webhook do not double-credit the campaign.
- Added `PaymentGateway.retrieveCheckoutSessionFunding(sessionId)`:
  - Stripe implementation retrieves and projects Checkout Session payment
    status, campaign id, and amount.
  - Mock implementation remembers immediately settled mock sessions.
- Added advertiser sign-in role inference from
  `callbackUrl=/dashboard/advertiser`, so post-purchase dashboard redirects
  select Advertiser instead of Developer by default.
- Added `checkLocalStripeDurability(env)` to `verify:local-runtime`. It now
  fails the dangerous local real-Stripe + memory-storage combination and tells
  the operator to use `STRIPE_MODE=mock`, Firestore emulator, or namespace
  isolated local Firestore before real Stripe tests.
- RED/GREEN verification passed:
  - RED sign-in test failed because advertiser callback still selected
    developer.
  - RED preflight test failed because `checkLocalStripeDurability` did not
    exist.
  - RED checkout-status/gateway tests failed because no session lookup or
    reconciliation existed.
  - GREEN focused commands passed:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/signin/page.test.ts`,
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\verify-local-runtime.test.mjs`,
    and
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/stripe/stripe-gateway.test.ts src/server/adapters/memory/memory-adapters.test.ts src/app/api/checkout-status/route.test.ts src/app/api/webhooks/stripe/route.test.ts`.
- Full regression verification passed after this change:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`
- `corepack pnpm@9.12.0 verify:local-runtime` now fails with the expected
  actionable blockers:
  - Stripe CLI is not on PATH.
  - Java is `1.8.0_491`, below the Java 11+ Firestore emulator requirement.
  - The diagnosed `.env` paired `SPINSHARE_MODE=local` and
    `STRIPE_MODE=test/live` with in-memory durable storage. The current guard
    now blocks that combination; use `STRIPE_MODE=mock` for sample ads, or
    configure Firestore emulator / namespace-isolated Firestore for real Stripe
    tests.

## 2026-06-16 extension no-ads / prod-local diagnosis

- Reproduced the current "no ads" symptom as an auth/environment problem, not
  as missing ad inventory:
  - The installed Claude Code hook in VS Code global storage points to
    `https://spinshare-web-vert.vercel.app`, not `http://localhost:3000`.
  - The installed terminal launcher also points to `https://spinshare-web-vert.vercel.app`
    and direct-launches `claude` through the native Claude Code adapter path.
  - `http://localhost:3000/api/ad` was unreachable during diagnosis, so the
    local sample server was not running. Local sample ads only exist when
    `corepack pnpm@9.12.0 dev:sample` is running.
  - Production `GET https://spinshare-web-vert.vercel.app/api/ad` with the locally mirrored
    SpinShare token returned `401`.
- Immediate conclusion: the current machine has a persisted token string, so
  the extension treats the user as signed in, but production rejects that token.
  The generated Claude hook then fetches `/api/ad`, receives non-OK, and
  silently shows no statusLine ad. This matches the user's report: extension
  installation does not visibly ask for sign-in, then ads disappear.
- This is not fixed by blindly rolling back to the old CLI spinner wrapper. The
  old wrapper would reintroduce stdout guessing and still needs a valid token to
  fetch authenticated ads. The correct short-term fix is token validation and a
  clean local/prod test loop.
- Existing prod/local packaging is real:
  - `vscode-extension/spinshare-prod-0.2.0.vsix` defaults to
    `https://spinshare-web-vert.vercel.app`.
  - `vscode-extension/spinshare-local-0.2.0.vsix` defaults to
    `http://localhost:3000`.
  - They intentionally share one extension id for now, so installing local
    replaces prod and avoids duplicate command/hook ownership.
- Required next code fix:
  1. Add a side-effect-free device-token validation endpoint in `web/`, rather
     than using `/api/ad` for validation because `/api/ad` can create progress
     markers and show telemetry.
  2. Add an extension API-client method for that validation endpoint.
  3. On extension activation, validate any stored scoped token. If invalid,
     delete that scoped SecretStorage token, clear the mirrored credentials
     file, show the sign-in status item, and prompt sign-in.
  4. Keep local/prod tokens scoped by normalized `spinshare.baseUrl`.
- Required manual verification after the fix:
  - Local sample path: run `corepack pnpm@9.12.0 dev:sample`, install
    `vscode-extension/spinshare-local-0.2.0.vsix`, sign in with the local
    developer test account, start a fresh `claude` session, and confirm the
    statusLine shows the SpinShare Local sample ad.
  - Production path: install `vscode-extension/spinshare-prod-0.2.0.vsix`,
    force sign-out/sign-in or let invalid-token validation prompt, then confirm
    production `/api/ad` no longer returns `401` for the mirrored token.

## 2026-06-16 extension invalid-token / prod-local credential fix

- Fixed the immediate no-ads root cause without rolling back the Claude Code
  adapter:
  - Added `GET /api/auth/device/validate`, a side-effect-free bearer token
    health check. It returns `200 { valid: true }` for valid tokens and
    `401 { valid: false }` for missing/invalid tokens, without bidding,
    creating progress rows, or incrementing ad telemetry.
  - `vscode-extension/src/api-client.ts` now exposes
    `validateDeviceToken()`, returning `valid`, `invalid`, or `unknown`.
    Network/offline errors are `unknown`, so localhost being down does not
    delete a good token.
  - `AuthManager.initialize()` now validates any stored scoped token on
    extension activation. Explicitly invalid tokens are deleted from the
    current baseUrl-scoped SecretStorage key, configured legacy keys are
    cleared, and the shared Claude hook credential file is removed. That makes
    the extension prompt sign-in again instead of silently showing no ads.
  - Shared Claude hook credentials now include `baseUrl` metadata when written
    by both the extension and npm CLI. Generated hooks ignore credentials whose
    `baseUrl` does not match the hook's configured API. Legacy no-`baseUrl`
    credentials are rejected when the target API is known, so ambiguous old
    tokens force re-login instead of defaulting to production.
- Local/prod usage model after this fix:
  - Local testing: run `corepack pnpm@9.12.0 dev:sample`, install
    `vscode-extension/spinshare-local-0.2.0.vsix`, sign in with the local
    developer test account, then start a fresh Claude Code session.
  - Production testing: install
    `vscode-extension/spinshare-prod-0.2.0.vsix`; if the stored token is stale,
    activation should clear it and prompt sign-in.
- RED/GREEN verification passed:
  - RED before implementation:
    - web validate route failed because `./route` did not exist;
    - extension tests failed because `validateDeviceToken()` did not exist and
      invalid stored tokens were kept;
    - CLI/extension Claude hook tests failed because mismatched `baseUrl`
      credentials were still used.
  - GREEN after implementation:
    - `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/auth/device/validate/route.test.ts`
      passed with 2 tests.
    - `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/api-client.test.ts src/auth.test.ts src/claude-code-adapter.test.ts`
      passed with 39 tests.
    - `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/credential-store.test.ts src/claude-code-adapter.test.ts`
      passed with 19 tests.
    - `corepack pnpm@9.12.0 --filter ./vscode-extension test -- scripts/package-variant.test.mjs`
      passed with 4 tests.
    - `corepack pnpm@9.12.0 --filter @spinshare/web test -- scripts/dev-local-sample.test.mjs`
      passed with 3 tests.
  - Packaging passed:
    `corepack pnpm@9.12.0 --filter ./vscode-extension package:all` rebuilt
    both `vscode-extension/spinshare-prod-0.2.0.vsix` and
    `vscode-extension/spinshare-local-0.2.0.vsix`.
  - VSIX spot check passed by extracting both packages:
    - prod package: display name `SpinShare`, base URL
      `https://spinshare-web-vert.vercel.app`;
    - local package: display name `SpinShare Local`, base URL
      `http://localhost:3000`;
    - both packages contain `/api/auth/device/validate`,
      `validateStoredToken`, and `credentialMatchesBaseUrl(parsed)` in the
      extension hook and bundled CLI hook code.
  - Full regression/typecheck passed after packaging:
    - `corepack pnpm@9.12.0 test` passed across core, web, CLI, and extension:
      core 38 tests, web 249 passed / 1 skipped, CLI 97 tests, extension 67
      tests.
    - `corepack pnpm@9.12.0 lint` passed across core, web, CLI, and extension
      TypeScript checks.
  - Local runtime smoke passed with `corepack pnpm@9.12.0 dev:sample`:
    - `GET http://localhost:3000/api/market` returned 1 live row with
      `adText: "SpinShare Local - sample ad for localhost testing"` and
      `$50.00` remaining budget.
    - `POST http://localhost:3000/api/auth/device/start` returned a device code
      and a `verificationUriComplete` under `http://localhost:3000/activate`.
    - The temporary dev server was stopped after the smoke check; no listener
      remained on port 3000.

## 2026-06-16 product reality check: dashboard, ranking, payout, clicks

This section answers the most direct product questions against the current
implementation.

### If a developer views an ad, does the developer dashboard show earnings?

It now tries to show earnings when the dashboard is opened, but scheduled flush
is still required for unattended reconciliation.

- `POST /api/track` accumulates short views and only settles after cumulative
  viewability reaches 3 seconds for the served campaign.
- Once cumulative viewability reaches 3 seconds, `recordImpression()` credits
  the hot counter store and enqueues a pending ledger entry.
- The developer dashboard balance is derived from the durable Firestore ledger
  via `container.ledger.listByDeveloper()` and `summarizeLedger()`, not directly
  from the hot RTDB pending counter.
- Before that ledger read, the dashboard now calls
  `flushPendingForRead(container, "developer-dashboard")`, which runs one
  best-effort `runFlushCycle()`.
- Production now has a protected `POST /api/internal/flush` endpoint that calls
  `runFlushCycle()` after validating `Authorization: Bearer
  <SPINSHARE_FLUSH_SECRET|CRON_SECRET>`.
- Production still needs an external scheduler, e.g. Cloud Scheduler for the
  documented Cloud Run deployment, to call that endpoint at most once per
  minute.

Current result: activity can show impression attempts; dashboard balance and
payout eligibility now attempt to catch up when read. They can still lag if
flush fails, if the queue is larger than one batch, or if no one opens the
dashboard/payout status.

### If an advertiser pays on the homepage, does ranking show the ad?

Yes, but only after the campaign is funded.

- Homepage checkout creates a campaign with `budgetCents = 0` and starts Stripe
  Checkout.
- The campaign becomes biddable/leaderboard-eligible only after Stripe funding
  is applied and `budgetCents > 0`.
- Funding is applied by either the Stripe webhook or `/api/checkout-status`
  reconciliation. The homepage already polls `/api/checkout-status` every 2
  seconds up to 15 times after returning from Stripe.
- `/api/market` ranks `campaigns.listBiddable()` by auction priority and hides
  campaigns where `publicOnLeaderboard === false`.

If a Stripe test payment returns but the leaderboard stays empty, the next
precise check is the `/api/checkout-status?checkout_session_id=...` response:
`funded` means it should enter ranking; `pending_webhook` or `unknown` means
the funding path did not complete.

### If an advertiser pays on the homepage, will the extension show that ad?

Yes after funding, assuming the extension is authenticated against the same
environment and `/api/ad` can validate the device token.

- `/api/ad` requires a valid bearer device token.
- It selects from the same biddable campaign pool (`budgetCents > 0` and
  `cpmCents > 0`) and does not require the campaign to be public on the
  leaderboard.
- If a developer has an incomplete cumulative view for a previous ad, `/api/ad`
  will keep returning that pending campaign first until it settles or becomes
  invalid.

### Does the advertiser dashboard show impressions for paid ads?

Partially yes.

- `/api/ad` increments campaign telemetry `shows` when an ad is served.
- `/api/track` increments telemetry for credited, too-short, invalid-token,
  invalid-campaign, shadow-banned, earning-capped, and duplicate outcomes.
- `/api/campaigns` returns each owned campaign with aggregate telemetry, and
  the advertiser dashboard reads that endpoint.
- `/api/activity/advertiser` returns campaign-scoped activity rows for the
  advertiser identity. Homepage-purchased campaigns are owned by a deterministic
  public advertiser id derived from the purchase email, and the dashboard also
  resolves that email-based advertiser id when the signed-in user's email
  matches.

Important caveat: credited durable impression counts in `/api/campaigns` are
maxed against `ledger.countByCampaignIds()`. `GET /api/campaigns` now runs one
best-effort read-time flush before reading those durable counts, so normal
dashboard refreshes catch up recent credited impressions. Production still needs
the scheduled flush endpoint for unattended reconciliation.

### If multiple advertisers pay, does bidding happen?

Yes. `selectAd()` loads biddable campaigns and uses the core winner function:
highest CPM wins, with tie-breakers by creation time and id. Unfunded campaigns
or campaigns with `cpmCents <= 0` are excluded.

### Can a developer really withdraw money?

The real-money payout path exists, but it is not proven production-ready until
Stripe Connect and flushing are verified end to end.

- The dashboard can create/reuse a Stripe Connect Express account and return a
  Stripe onboarding link.
- `POST /api/payouts/withdraw` requires a signed-in browser session, same-origin
  POST, a connected account with `payouts_enabled`, and at least the minimum
  payout balance.
- In Stripe mode, the payout gateway uses `transfers.create()` to move funds
  from the platform Stripe balance to the connected account. Stripe then pays
  out to the developer's bank on the connected account payout schedule.
- The withdraw service reserves/debits the durable user balance before calling
  Stripe, preventing concurrent double-withdraw attempts; it restores that
  balance if the Stripe transfer fails.
- If Stripe/Connect rejects the transfer, the route now returns sanitized
  `502 payout_withdraw_failed` details with request id/status/code only; raw
  provider messages, headers, and secrets are not returned.
- Withdraw attempts now write developer activity rows for success, typed blocked
  attempts, and provider failures, so the developer activity ledger can explain
  cash-out outcomes.
- Withdraw attempts now also write durable provider reconciliation records:
  `blocked`, `pending`, `paid`, or `failed`, with amount, connected account id,
  provider payout/request id, provider status, and provider code where available.

Current risks:

- Durable balance depends on `runFlushCycle()` running; dashboard and payout
  status reads now run one best-effort cycle, but scheduled flushing is still
  required for unattended production reconciliation.
- Platform Stripe balance and Connect onboarding must be valid in the selected
  Stripe mode.
- This audit did not execute a live/test Connect withdrawal.
- Settlement polling, retry workers, and accounting exports are not implemented.

### Are CLI ads clickable?

Yes where the terminal/Claude Code status line supports OSC 8 hyperlinks.

- `/api/ad` rewrites campaign destinations to `/api/click?campaignId=...`.
- `/api/click` validates the campaign destination, increments click telemetry,
  then redirects to the advertiser URL.
- The Claude Code statusLine adapters wrap ad text with an OSC 8 hyperlink when
  `destinationUrl` exists. The VS Code extension variant also sets
  `FORCE_HYPERLINK=1` in Claude settings so Windows Terminal/VS Code integrated
  terminal preserves clickable links.
- The legacy spinner wrapper also wraps rendered ad text with OSC 8.

Limit: terminals that strip OSC 8 escape sequences will show colored/plain text
but may not make it clickable.

## 2026-06-16 protected flush trigger endpoint

- Added `POST /api/internal/flush`.
- The endpoint fails closed when neither `SPINSHARE_FLUSH_SECRET` nor
  `CRON_SECRET` is configured (`503 flush_secret_not_configured`).
- The endpoint requires `Authorization: Bearer <secret>` and returns `401` for
  missing/wrong bearer auth without draining pending work.
- On success, it delegates to `runFlushCycle()` and returns a compact summary:
  `drained`, `flushed`, `batchToken`, `balanceDeltaCentsByUser`, and
  `budgetDeltaCentsByCampaign`.
- `verify:prod-env` now fails production configs missing
  `SPINSHARE_FLUSH_SECRET` or `CRON_SECRET`.
- `docs/production-test-guide.md` now documents the Cloud Scheduler/manual POST
  check for the Cloud Run deployment.
- RED/GREEN verification:
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/internal/flush/route.test.ts`
    failed because `./route` did not exist.
  - GREEN: the same focused test passed with 3 tests after adding the route.
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\verify-prod-env.test.mjs`
    failed because production preflight accepted a missing flush secret.
  - GREEN: the same focused test passed with 4 tests after adding the check.

## 2026-06-16 local Stripe test durability guard

Root cause for the user's "Stripe test paid but leaderboard/dashboard did not
show it" symptom was confirmed in the current `.env`:

- `SPINSHARE_MODE="local"`
- `STRIPE_MODE="test"`
- `SPINSHARE_USE_FIRESTORE` was unset
- `SPINSHARE_FIRESTORE_NAMESPACE` was unset

That meant the real Stripe Checkout Session could complete while the campaign
and checkout activity lived only in process memory. A redirect, webhook, server
restart, or different runtime instance could then read a different store and
show no campaign.

Implemented guard:

- `buildContainer()` now rejects local `STRIPE_MODE=test|live` unless local
  durable storage is Firestore (`FIRESTORE_EMULATOR_HOST` or
  `SPINSHARE_USE_FIRESTORE=1`).
- Existing local cloud Firestore isolation still requires
  `SPINSHARE_FIRESTORE_NAMESPACE`, so localhost writes go under
  `namespaces/test/...` instead of top-level production collections.
- The current `.env` was updated to:
  - `SPINSHARE_USE_FIRESTORE=1`
  - `SPINSHARE_FIRESTORE_NAMESPACE="test"`

Verification:

- RED:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/container.test.ts`
  failed because `buildContainer(local + STRIPE_MODE=test)` did not throw.
- GREEN: the same focused test passed with 7 tests after adding the guard.
- `corepack pnpm@9.12.0 verify:local-runtime` now passes
  `env.local.firestoreIsolation` and `env.local.stripeDurability`.
- The preflight now treats Java as required only when
  `FIRESTORE_EMULATOR_HOST` is selected. With the current namespace Firestore
  setup, Java is not required.
- Remaining local runtime blocker: `stripe` is not on PATH, so real webhook
  forwarding still cannot be verified from this machine.

Follow-up runtime preflight fix:

- `runPreflightChecks()` now uses an env-aware Java check.
- Namespace-isolated cloud Firestore reports:
  `PASS java.version: Firestore emulator is not selected; Java runtime is not required`.
- Emulator compatibility remains strict through `checkJavaVersionOutput()` and
  still requires Java 11+ when the emulator is actually selected.

## 2026-06-16 payout concurrent-withdraw safety fix

Root cause found in the withdrawal path:

- `withdrawBalance()` read the developer's durable balance.
- It called Stripe payout/transfer.
- It then debited the local durable balance.

Two concurrent withdraw requests could both read the same starting balance,
both call Stripe, and then double-debit the user, potentially moving money
twice and leaving a negative balance.

Implemented fix:

- `UserRepository` now exposes `tryDebitBalanceCents(id, amountCents)`.
- Memory and Firestore user repositories implement it atomically.
- `withdrawBalance()` now reserves the exact durable balance before calling
  Stripe.
- If another request already reserved the balance, the loser returns
  `409 balance_changed` and does not call the payout gateway.
- If the payout gateway throws after reservation, the service restores the
  reserved balance.

Verification:

- RED:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/payout-service.test.ts`
  failed because two concurrent withdraw calls recorded two payout requests.
- GREEN: the same focused test passed with 5 tests after the reservation fix.

Remaining payout caveat:

- This prevents double-paying the same durable balance, but it is still not a
  full production payout ledger. A future payout ledger should persist payout
  attempts, provider ids, failure/retry state, and reconciliation metadata.

## 2026-06-16 withdraw provider failure redaction

Root cause:

- `withdrawBalance()` already restores the reserved durable balance when the
  provider transfer throws.
- `POST /api/payouts/withdraw` did not catch that exception, so Stripe/Connect
  failures could bubble as generic/raw 500s instead of a controlled response.

Implemented fix:

- Added route-level `providerFailureBody()` for withdraw failures.
- Provider transfer exceptions now return `502 payout_withdraw_failed` with only
  safe diagnostic fields: `requestId`, `providerStatus`, and `providerCode`.
- The route logs the sanitized body rather than raw provider headers or secret
  material.

Verification:

- RED:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/payouts/withdraw/route.test.ts`
  failed because the route threw the provider error.
- GREEN: the same route test passed with 3 tests after the sanitized catch.
- Payout focused verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/payouts/withdraw/route.test.ts src/app/api/payouts/status/route.test.ts src/app/api/payouts/connect/route.test.ts src/server/payout-service.test.ts`
  with 4 files / 13 tests.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- Web full test suite passed after this change:
  `corepack pnpm@9.12.0 --filter @spinshare/web test` with 61 files passed, 1
  skipped; 271 tests passed, 1 skipped.

Remaining caveat:

- This makes provider failures safe and explainable at the HTTP boundary. The
  later developer payout activity rows make attempts visible to users, and the
  payout-attempt repository adds internal reconciliation records. Retry workers,
  settlement polling, and accounting exports are still future work.

## 2026-06-16 developer payout activity ledger update

Root cause:

- Developer activity previously covered impression attempts but not cash-out
  attempts.
- A successful payout, a below-minimum/not-connected block, or a provider
  transfer failure could affect user trust but not appear in the activity
  ledger.

Implemented fix:

- Added developer payout activity types to the shared activity model:
  `payoutPaid`, `payoutBlocked`, and `payoutFailed`.
- Memory and Firestore activity repositories now preserve `developer_event`
  payout rows and return them from `listByDeveloper()`.
- `/api/activity/developer` now serializes payout rows with amount, provider
  event id, provider status, and provider code metadata.
- `/api/activity/advertiser` explicitly excludes `developer_event` rows so
  advertiser campaign timelines remain campaign-scoped.
- Shared dashboard activity formatting now renders payout rows with
  payout-specific labels and provider trace details.
- `POST /api/payouts/withdraw` records best-effort payout activity for:
  - successful transfers (`payoutPaid`, provider transfer id),
  - typed service failures such as `below_minimum` (`payoutBlocked`),
  - provider transfer exceptions (`payoutFailed`, request/status/code).

Verification:

- RED:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/api/activity/developer/route.test.ts src/app/api/payouts/withdraw/route.test.ts src/server/adapters/memory/memory-activity-repository.test.ts`
  failed because payout rows formatted as fake impression rows, developer API
  dropped payout fields, and withdraw did not record activity.
- GREEN focused verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/api/activity/developer/route.test.ts src/app/api/activity/advertiser/route.test.ts src/app/api/payouts/withdraw/route.test.ts src/server/adapters/memory/memory-activity-repository.test.ts`
  with 5 files / 22 tests.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- Web full test suite passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test` with 61 files passed, 1
  skipped; 274 tests passed, 1 skipped.

Remaining caveat:

- This gives user-facing payout activity and provider trace ids. The later
  payout-attempt repository adds internal reconciliation state; retry workers,
  provider settlement polling, and accounting exports are still future work.

## 2026-06-16 payout attempt reconciliation ledger

Root cause:

- User-facing payout activity rows explained what the developer saw, but there
  was no independent provider/accounting record for each withdrawal attempt.
- That made production reconciliation weaker: success, typed blocks, provider
  failures, and concurrent balance races were visible in activity, but not stored
  as a provider attempt lifecycle.

Implemented fix:

- Added `PayoutAttemptRepository` with `pending`, `paid`, `failed`, and
  `blocked` attempt states.
- Added `MemoryPayoutAttemptRepository` and `FirestorePayoutAttemptRepo`.
- Added the namespace-aware Firestore collection path
  `COLLECTIONS.payoutAttempts`.
- Wired `container.payoutAttempts` in memory and Firestore modes.
- `withdrawBalance()` now records:
  - `blocked` attempts for not-connected, below-minimum, and balance-changed
    paths;
  - a `pending` attempt before balance reservation/provider transfer;
  - a `paid` attempt with provider payout id after success;
  - a `failed` attempt with provider request/status/code after provider transfer
    exceptions, while restoring reserved balance.

Verification:

- RED:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/payout-service.test.ts`
  failed with `MemoryPayoutAttemptRepository is not a constructor`.
- GREEN focused verification:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/payout-service.test.ts`
  passed 6 tests.
- Related verification:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/payouts/withdraw/route.test.ts src/server/adapters/firestore/collections.test.ts src/server/container.test.ts`
  passed 3 files / 16 tests.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- Web full regression passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test` with 61 files passed, 1
  skipped; 279 tests passed, 1 skipped.

Remaining caveat:

- This is now a provider attempt ledger, but not an automated payout operations
  system. Stripe settlement polling, retry workers, accounting exports, and a
  real test/live Connect withdrawal smoke test remain outstanding.

## 2026-06-16 advertiser campaign read-time flush update

Root cause:

- Advertiser dashboard campaign cards read `/api/campaigns`.
- `/api/track` writes credited impressions to the hot counter store and pending
  ledger queue first; durable campaign budget and durable ledger counts only
  update after `runFlushCycle()`.
- Developer dashboard and payout status already performed a read-time flush, but
  `/api/campaigns` still read stale durable budget / credited counts directly.

Implemented fix:

- `GET /api/campaigns` now calls
  `flushPendingForRead(container, "advertiser-campaigns")` after successful
  auth and before listing campaigns, reading campaign telemetry, or counting
  durable impressions.
- This makes advertiser dashboard refreshes catch up pending credited
  impressions and budget decrements without waiting for the scheduler.
- The helper is best-effort and logs failures instead of failing the dashboard
  response.

Verification:

- RED before implementation:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
  failed because a pending credited impression returned stale
  `budgetCents: 5000` and `telemetry.credited: 0` instead of the flushed
  `4997` / `1`.
- GREEN focused after implementation:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
  passed 5 tests.
- Related focused verification:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/server/flush-before-read.test.ts`
  passed 2 files / 7 tests.
- Web typecheck:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- Full web regression:
  `corepack pnpm@9.12.0 --filter @spinshare/web test` passed 61 files, 1 skipped;
  275 tests, 1 skipped.

Remaining caveat:

- This improves read-your-writes behavior for dashboard users, but it is still
  one bounded flush cycle per read. Production still needs scheduled
  `POST /api/internal/flush` so accounting reconciles when no one opens a
  dashboard and when the pending queue is larger than one batch.

## 2026-06-16 npm CLI Claude statusLine hyperlink parity

Root cause:

- Both the VS Code extension adapter and npm CLI adapter render Claude Code
  statusLine ads as OSC8 terminal hyperlinks when an ad has a destination URL.
- The VS Code extension adapter already writes `env.FORCE_HYPERLINK = "1"` into
  Claude settings, which helps Claude Code/terminal stacks preserve clickable
  OSC8 links.
- The npm CLI adapter generated the same hyperlink escape sequence but did not
  set this env flag, so npm-only installs could show colored ad text without a
  clickable link in terminals that depend on the flag.

Implemented fix:

- `cli-wrapper/src/claude-code-adapter.ts` now merges existing Claude
  `settings.env`, preserves unrelated env keys, and forces
  `FORCE_HYPERLINK: "1"` when installing the npm CLI Claude Code adapter.

Verification:

- RED before implementation:
  `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts`
  failed because merged settings preserved `FORCE_HYPERLINK: "0"`.
- GREEN focused after implementation:
  `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts`
  passed 10 tests.
- Related CLI verification:
  `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts src/index.test.ts src/credential-store.test.ts`
  passed 3 files / 23 tests.
- CLI typecheck:
  `corepack pnpm@9.12.0 --filter @spinshare/cli lint` passed.

Remaining caveat:

- OSC8 clickability still depends on Claude Code and the terminal preserving
  hyperlinks. This fix aligns npm CLI settings with the extension; real Windows
  Terminal / VS Code integrated terminal behavior still needs manual smoke
  verification after installing the rebuilt package.

## 2026-06-16 read-time pending flush for dashboard and payout status

Root cause:

- `/api/track` credits first land in hot pending counters and pending ledger
  queue.
- The developer dashboard and payout status read durable ledger/user balance.
- Without the scheduler calling `/api/internal/flush`, a user could watch a
  credited ad and still see stale earnings or payout eligibility.

Implemented fix:

- Added `web/src/server/flush-before-read.ts`.
- `flushPendingForRead(container, context)` runs one bounded
  `runFlushCycle()` and logs failures instead of throwing into user-facing
  reads.
- `web/src/app/dashboard/developer/layout.tsx` now calls it before
  `container.ledger.listByDeveloper(developerId)`.
- `web/src/app/api/payouts/status/route.ts` now calls it before
  `users.getById(developerId)`.

Verification:

- RED:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/flush-before-read.test.ts`
  failed because `./flush-before-read` did not exist.
- GREEN: the same helper test passed with 2 tests after implementation.
- RED:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/payouts/status/route.test.ts`
  failed because `flushPendingForRead` was not called.
- GREEN: the payout status route test passed with 3 tests after wiring.
- RED:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/layout.test.tsx`
  failed because dashboard layout did not call `flushPendingForRead`.
- GREEN: the developer layout test passed with 1 test after wiring.
- Focused combined verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/flush-before-read.test.ts src/app/api/payouts/status/route.test.ts src/app/dashboard/developer/layout.test.tsx`
  with 3 files / 6 tests.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- Web full test suite passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test` with 60 files passed, 1
  skipped; 268 tests passed, 1 skipped.

Remaining caveat:

- This improves read-your-writes behavior, but it is intentionally one bounded
  cycle. Production still needs the protected scheduled flush endpoint so money
  reconciles even when no one opens the dashboard.

## 2026-06-16 advertiser dashboard checkout reconciliation

Root cause:

- Real Stripe checkout funding has two settlement paths:
  - primary: Stripe webhook to `/api/webhooks/stripe`;
  - fallback: homepage `/api/checkout-status` queries Stripe by
    `checkout_session_id` after redirect.
- Advertiser dashboard reads `/api/campaigns`, but it did not run that fallback.
  If local Stripe test payment succeeded while webhook forwarding was missing
  or delayed, the campaign stayed `budgetCents = 0`.
- A zero-budget campaign is not biddable, so it does not show in the public
  ranking/market or extension ad feed even though Stripe says the session is
  paid.

Implemented fix:

- Added `web/src/server/checkout-reconciliation.ts`.
- `reconcilePaidCheckoutSession()` centralizes provider-verified Checkout
  Session reconciliation and uses `paymentEvents.markApplied()` before applying
  budget.
- `GET /api/checkout-status` now uses the shared helper; behavior remains the
  same.
- `GET /api/campaigns` now reconciles pending paid checkout sessions for the
  authenticated advertiser's owned campaigns, then refreshes the campaign list
  before returning budget/dashboard data.

Verification:

- RED before implementation:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
  failed because a paid provider lookup still returned the claimed public
  campaign with `budgetCents: 0`.
- GREEN focused after implementation:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
  passed 6 tests.
- Related focused verification:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/checkout-status/route.test.ts src/app/api/campaigns/route.test.ts src/app/api/market/route.test.ts src/app/api/advertiser-checkout/route.test.ts`
  passed 4 files / 19 tests.
- Web typecheck:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- Web full regression:
  `corepack pnpm@9.12.0 --filter @spinshare/web test` passed 61 files, 1 skipped;
  276 tests, 1 skipped.

Remaining caveat:

- This repairs advertiser dashboard reads and local webhook-missed tests, but it
  does not replace the production webhook. If nobody opens checkout status or
  the advertiser dashboard, paid sessions still need Stripe webhook delivery to
  settle automatically.

## 2026-06-16 full regression after dashboard checkout reconciliation

Verification:

- `corepack pnpm@9.12.0 test` passed end-to-end:
  - core: 5 files / 39 tests; core build passed.
  - web: 61 files passed, 1 skipped; 276 tests passed, 1 skipped.
  - cli: 12 files / 97 tests.
  - vscode-extension: 8 files / 67 tests.
- `corepack pnpm@9.12.0 lint` passed:
  - core `tsc --noEmit`
  - core build
  - web `tsc --noEmit`
  - CLI `tsc --noEmit`
  - VS Code extension `tsc --noEmit`

Remaining caveat:

- This is repository-level test/typecheck proof. It does not prove live Stripe
  webhook delivery, live Stripe Connect payout settlement, or real terminal
  hyperlink click behavior; those still require external smoke tests.

## 2026-06-16 full regression after advertiser flush and CLI hyperlink fixes

Verification:

- `corepack pnpm@9.12.0 test` passed end-to-end:
  - core: 5 files / 39 tests; core build passed.
  - web: 61 files passed, 1 skipped; 275 tests passed, 1 skipped.
  - cli: 12 files / 97 tests.
  - vscode-extension: 8 files / 67 tests.
- `corepack pnpm@9.12.0 lint` passed:
  - core `tsc --noEmit`
  - core build
  - web `tsc --noEmit`
  - CLI `tsc --noEmit`
  - VS Code extension `tsc --noEmit`

Remaining caveat:

- This verifies the repository test/typecheck surface. Real Stripe webhook
  delivery, Stripe Connect payout settlement, and real Claude Code terminal
  hyperlink behavior still require external smoke tests in the intended
  runtime.

## 2026-06-16 full regression after status cleanup

Verification:

- `corepack pnpm@9.12.0 test` passed end-to-end:
  - core: 5 files / 39 tests; core build passed.
  - web: 61 files passed, 1 skipped; 278 tests passed, 1 skipped.
  - cli: 12 files / 97 tests.
  - vscode-extension: 8 files / 67 tests.
- `corepack pnpm@9.12.0 lint` passed:
  - core `tsc --noEmit`
  - core build
  - web `tsc --noEmit`
  - CLI `tsc --noEmit`
  - VS Code extension `tsc --noEmit`

Remaining caveat:

- This verifies the repository test/typecheck surface and the current docs now
  avoid stale localhost/activity-ledger claims. Real Stripe webhook delivery,
  Stripe Connect payout settlement, and real Claude Code terminal hyperlink/TUI
  behavior still require external smoke tests in the intended runtime.

## 2026-06-16 full regression after payout attempt ledger

Verification:

- `corepack pnpm@9.12.0 test` passed end-to-end:
  - core: 5 files / 39 tests; core build passed.
  - web: 61 files passed, 1 skipped; 279 tests passed, 1 skipped.
  - cli: 12 files / 97 tests.
  - vscode-extension: 8 files / 67 tests.
- `corepack pnpm@9.12.0 lint` passed:
  - core `tsc --noEmit`
  - core build
  - web `tsc --noEmit`
  - CLI `tsc --noEmit`
  - VS Code extension `tsc --noEmit`

Remaining caveat:

- This verifies the repository test/typecheck surface after adding durable
  payout attempt records. Real Stripe webhook delivery, live/test Stripe Connect
  payout settlement, and real Claude Code terminal hyperlink/TUI behavior still
  require external smoke tests in the intended runtime.

## 2026-06-17 external smoke audit and Connect fallback

Scope:

- Tested the previously unverified external/runtime gaps: Stripe webhook to
  durable storage, Stripe Connect account creation, Claude Code runtime
  availability, CLI/statusLine click bytes, ad safety gates, production env
  readiness, low-CPM bidding behavior, and dashboard/activity ledger coverage.
- Made one narrow code fix in `web/src/server/adapters/stripe/stripe-payout-gateway.ts`
  after real Stripe Connect smoke exposed an invalid Accounts v2 payload and a
  v2-unavailable platform account.

Results:

- Stripe webhook to durable Firestore storage: test-mode external smoke passed
  with Stripe CLI forwarding `checkout.session.completed` to local Next and a
  unique Firestore namespace. Evidence:
  `marketBudgetCents=3000`, `firestoreBudgetCents=3000`, `publicRank=1`.
- Stripe Connect: not production/test ready yet. The code no longer sends the
  invalid Accounts v2 `requirements_collector` field and now falls back to
  controller-based Express `accounts.create()` when Accounts v2 is blocked.
  External smoke then failed at Stripe platform setup:
  `You can only create new accounts if you've signed up for Connect`. The
  account must enable Stripe Connect before real onboarding/withdrawal can pass.
- Claude Code runtime: local preflight found
  `C:\Users\noahz\AppData\Roaming\npm\claude.CMD`; escalated checks returned
  `2.1.170 (Claude Code)` and help confirms interactive mode is default.
  Automated tests verify generated Claude hooks/statusLine scripts, session
  gating, OSC8 hyperlink bytes, and statusLine output. Real visual TUI placement
  and mouse click behavior still need manual terminal verification after install.
- CLI clickable ads: OSC8 rendering is implemented and tested, but actual click
  support depends on the terminal. This cannot be proven from noninteractive
  shell output.
- Ad safety: deterministic URL/copy safety gates and `reviewStatus` filtering
  are implemented and tested. Source scan found no OpenRouter/Gemma/manual
  review worker implementation; that remains future work.
- Production env: `verify:prod-env` still fails because current env has
  `SPINSHARE_MODE=local` and neither `SPINSHARE_FLUSH_SECRET` nor
  `CRON_SECRET`; provider reads work and Stripe key is test mode
  (`livemode=false`).
- Local runtime isolation: `verify:local-runtime` passed and confirms local
  Firestore is namespace-isolated under `test`.
- Low CPM behavior: local smoke with a $5 CPM campaign showed it enters market
  at rank 2, but `/api/ad` still returns the $30 CPM seed campaign:
  `lowBidCpmCents=500`, `winnerCampaignId=cmp-local-demo`,
  `winnerCpmUsd=30.00`.
- Activity/earning ledger: focused track, atomic impression, ledger,
  dashboard, and activity API tests passed, proving the code path exists. This
  is automated coverage, not a real end-user browser session.

Verification:

- RED/GREEN Connect gateway:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/stripe/stripe-payout-gateway.test.ts`
  failed before the fix, then passed 5 tests after the fix.
- Web typecheck:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- Payout focused:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/payout-service.test.ts src/app/api/payouts/connect/route.test.ts src/app/api/payouts/withdraw/route.test.ts src/app/api/payouts/status/route.test.ts src/server/adapters/stripe/stripe-payout-gateway.test.ts`
  passed 5 files / 19 tests.
- Webhook focused:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/webhooks/stripe/route.test.ts src/app/api/webhooks/stripe/signature.integration.test.ts src/app/api/webhooks/stripe/payment.property.test.ts src/app/api/webhooks/stripe/unverifiable.property.test.ts`
  passed 4 files / 11 tests.
- CLI/statusLine focused:
  `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts src/renderer.test.ts`
  passed 2 files / 23 tests.
- Local CLI smoke:
  `corepack pnpm@9.12.0 smoke:local-cli` passed with
  `renderedLocalAd=true`.
- Safety/bidding focused:
  `corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`
  passed 24 tests, and
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/advertiser-checkout/route.test.ts src/app/api/campaigns/route.test.ts src/app/api/market/route.test.ts src/server/bidding-service.test.ts`
  passed 4 files / 22 tests.
- Ledger/dashboard/activity focused:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/track/route.test.ts src/server/ledger-service.property.test.ts src/server/atomic-impression.test.ts src/app/dashboard/developer/layout.test.tsx src/app/dashboard/developer/dashboard.property.test.ts src/app/api/activity/developer/route.test.ts src/app/api/activity/advertiser/route.test.ts`
  passed 7 files / 22 tests.
- Repository-level regression:
  `corepack pnpm@9.12.0 test` passed with core 39 tests, web 303 passed / 1
  skipped, CLI 100 tests, and VS Code extension 67 tests.
- Repository-level typecheck/lint:
  `corepack pnpm@9.12.0 lint` passed for core, web, CLI, and VS Code extension.

Remaining blockers:

- Enable Stripe Connect on the Stripe account, then rerun Connect onboarding
  and withdrawal smoke with a payouts-enabled test connected account.
- Set production env correctly:
  `SPINSHARE_MODE=production`, a flush/cron secret, durable stores, and a
  scheduled caller for `/api/internal/flush`.
- Manually verify Claude Code native TUI visual placement and terminal click
  behavior in the intended terminal/IDE because noninteractive tests cannot
  click OSC8 links or inspect the live TUI.
- Build the async/manual/LLM ad review worker if policy requires more than the
  deterministic first-pass safety gate.
