# docs/project-status.md mirror

## Purpose
`docs/project-status.md` is the single project status and architecture decision document for SpinShare. It records what the product is, what is currently broken, and what should be fixed first.

## Current update

2026-06-17 verification update:

- Payout Connect follow-up: a real `/api/payouts/connect` failure returned
  Stripe `identity_country_required` (`req_v2qEFpphvh4k0ngvw`). This was a
  request-shape bug, not a Stripe Dashboard mystery. The Accounts v2 recipient
  create payload now includes `identity: { country: "us" }`; the connect route
  maps known Connect platform setup blockers to
  `reason: "stripe_connect_not_enabled"` with request id/status/code preserved;
  and `PayoutPanel` now parses sanitized failure JSON instead of showing only
  the generic retry message. Focused payout tests passed with 3 files / 11
  tests.
- Earnings/env follow-up: CLI credential stores now reject legacy untagged file
  or keytar credentials whenever the store is configured with a concrete
  `baseUrl`. This closes the remaining silent-mix path where an ambiguous old
  token could be reused against localhost or production. Focused RED/GREEN
  verification passed in `cli-wrapper/src/credential-store.test.ts`. Fresh root
  verification also passed: `corepack pnpm@9.12.0 test` (core 39, web 307
  passed / 1 skipped, CLI 107, extension 67) and `corepack pnpm@9.12.0 lint`.
- Repackaged extension artifacts after the earnings/environment fixes:
  `spinshare-prod-0.2.0.vsix` and `spinshare-local-0.2.0.vsix` were rebuilt on
  2026-06-17, and the legacy `spinshare-0.2.0.vsix` filename was refreshed from
  the rebuilt prod artifact. Manifest inspection confirmed prod defaults to
  `https://www.spinshare.dev`, local defaults to `http://localhost:3000`, both
  packaged Claude adapters enforce strict baseUrl token matching, and both
  bundled CLI builds include strict credential environment checks.
- Local sample/runtime verifier tests passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- scripts/dev-local-sample.test.mjs scripts/verify-local-runtime.test.mjs scripts/verify-prod-env.test.mjs`
  with 3 files / 23 tests.
- Extension package variant tests passed:
  `corepack pnpm@9.12.0 --filter ./vscode-extension test -- scripts/package-variant.test.mjs`
  with 1 file / 4 tests.
- Extension dual packaging was verified by running
  `corepack pnpm@9.12.0 --filter ./vscode-extension package:all`, then
  extracting the VSIX manifests:
  `spinshare-prod-0.2.0.vsix` defaults `spinshare.baseUrl` to
  `https://www.spinshare.dev`, while `spinshare-local-0.2.0.vsix` defaults it
  to `http://localhost:3000`.
- `corepack pnpm@9.12.0 verify:local-runtime` passed on this workstation:
  Node 22.16.0 and the `claude`, `stripe`, `firebase`, and `npx` commands were
  available.
- The first sandboxed production preflight failed because external network
  access was blocked. Rerunning `corepack pnpm@9.12.0 verify:prod-env` with
  network permission reached Firebase Firestore, Firebase RTDB, Stripe, GitHub
  OAuth, and Google OAuth.
- The remaining real production preflight failure is env configuration:
  `SPINSHARE_MODE` must be `production`, and `SPINSHARE_FLUSH_SECRET` or
  `CRON_SECRET` must be set.
- E2E verification was repaired for the current authenticated/cumulative
  contract. `corepack pnpm@9.12.0 test:e2e` first failed because the tests still
  expected anonymous `/api/ad` and direct `/api/track`; after updating the tests
  to expect anonymous `/api/ad` `401` and to call `/api/ad` before successful
  `/api/track`, `test:e2e` passed with 3 files / 7 tests. Related API tests for
  `/api/ad`, `/api/track`, and bidding passed with 3 files / 18 tests, and web
  typecheck passed.
- Full normal regression after the e2e repair passed:
  `corepack pnpm@9.12.0 test` covered core (39 tests), web (282 tests, 1
  skipped), CLI (97 tests), and VS Code extension (67 tests). `corepack
  pnpm@9.12.0 lint` passed across core, web, CLI, and extension.

Current functional truth table update:

- Full functional audit update added on 2026-06-17. Fresh verification passed:
  `smoke:local-checkout`, `smoke:local-cli`, focused web/extension tests, full
  root `test`, and full root `lint`. The conclusion is not "everything is
  done": local happy paths for sample ads, homepage mock purchase, leaderboard,
  authenticated ad feed, advertiser dashboard, and advertiser activity are
  verified. Remaining gaps are real Stripe webhook/durable-storage smoke, real
  Stripe Connect withdrawal smoke, real Claude Code TUI placement/click manual
  verification, async LLM/manual ad review worker, and production env/scheduled
  flush readiness.
- Local checkout smoke was added and passed on 2026-06-17:
  `corepack pnpm@9.12.0 smoke:local-checkout`. The first run exposed a real
  same-email advertiser dashboard bug: mock device-token approval dropped the
  session email claim, so `/api/campaigns` could not resolve
  `publicAdvertiserIdForEmail(claims.email)`. `MockAuthProvider` now preserves
  optional `email`, `provider`, and `role` claims during user-code approval, and
  a regression test covers it. The successful smoke verified settled checkout,
  public market rank, authenticated `/api/ad`, advertiser dashboard campaign
  visibility, and advertiser activity rows for the purchased local campaign.
- Direct product Q&A added to the main document on 2026-06-17:
  developer earnings appear only after authenticated ad serving, cumulative 3s
  tracking, and a successful best-effort/durable flush; homepage-paid campaigns
  appear in leaderboard and extension/CLI only after funded budget is reconciled
  in the same storage environment; advertiser dashboard ownership for homepage
  checkout depends on signing in with the same email; multiple advertisers bid
  by deterministic highest-CPM priority; withdrawals are a real Stripe Connect
  path but still require onboarding, payout eligibility, durable balance, and
  external smoke validation; CLI clickability depends on OSC 8 support and
  routes through signed `/api/click` redirects.
- Developer earnings are conditional, but dashboard/payout reads now try to
  catch up. `/api/ad` requires a valid device token, `/api/track` settles only
  after cumulative same developer/campaign view time reaches 3000 ms, and
  settled impressions first enter the hot counter/pending ledger path. The
  developer dashboard reads durable ledger entries through
  `container.ledger.listByDeveloper()`, but now runs one best-effort
  `runFlushCycle()` before that read. `/api/payouts/status` does the same before
  reading durable `balanceCents`. Scheduled `/api/internal/flush` is still
  required for unattended production reconciliation.
- Homepage-paid campaigns appear on leaderboard/extension only after they are
  actually funded in the same storage environment. In Stripe mock mode funding
  is immediate. In Stripe test/live, budget is applied by either
  `/api/webhooks/stripe` on `checkout.session.completed` or by
  `/api/checkout-status?checkout_session_id=cs_...` reconciliation. `/api/market`
  and `/api/ad` only consider biddable campaigns with `budgetCents > 0`. As of
  2026-06-17, when checkout-status confirms `funded`, the homepage immediately
  refreshes `/api/market` instead of waiting for the next 15-second poll.
  Related payment/leaderboard verification passed with 5 files / 25 tests:
  checkout-status route, market route, campaigns route, checkout banner, and
  homepage.
- Advertiser dashboard ownership now supports same-email public checkout claims:
  dashboard APIs check both the signed-in user id and
  `publicAdvertiserIdForEmail(claims.email)`. This requires the login email to
  match the homepage checkout email.
- Multiple paid advertisers do bid. `selectWinner()` filters funded campaigns and
  picks highest CPM, then earliest creation time, then lowest id. This is
  deterministic winner-takes-current-auction behavior, not weighted rotation.
- Withdrawal is a real Stripe Connect path but requires connected account,
  `payouts_enabled`, durable balance at or above the minimum, and enough Stripe
  platform balance. Dashboard/payout reads now try one best-effort flush, but
  scheduled flushing is still required for unattended durable balance updates.
- CLI ads are clickable only where OSC 8 terminal hyperlinks are supported.
  `/api/ad` rewrites destinations through
  `/api/click?campaignId=...&clickToken=...`. `/api/click` redirects only to the
  stored campaign destination after shared destination validation, and increments
  `clicks` only when the signed click token verifies. Missing/invalid tokens
  still redirect but do not count telemetry.
- The earlier localhost isolation P0 gap is fixed in code: Firestore cloud writes
  can be scoped by `SPINSHARE_FIRESTORE_NAMESPACE=test`, and local RTDB hot
  counters now derive their root from that namespace instead of the shared
  `spinshare/hot` tree. Remaining risk is external smoke validation for real
  Stripe webhook delivery, Firestore emulator write-through, and real Claude Code
  terminal behavior.
- Local `dev:sample` now also forces memory-only storage by setting
  `SPINSHARE_USE_FIRESTORE=0` and clearing `FIRESTORE_EMULATOR_HOST`, so sample
  ads do not inherit cloud/emulator Firestore settings from `.env`. A real smoke
  verified `/api/health` and `/api/market`; market returned the seeded
  `SpinShare Local` campaign. The same check is now repeatable through
  `corepack pnpm@9.12.0 smoke:local-sample`, which starts `dev:sample`, validates
  health + market, signs in with local developer credentials, approves a device
  flow, validates authenticated `/api/ad`, stops the server, and exits `0` on
  success.
- Local CLI smoke is now repeatable and passing. The first bounded run proved
  the CLI rendered the local sample ad and called `/api/track`, but timed out
  after the wrapped fake AI command ended. Direct node-pty verification showed
  Windows `node-pty` emits `onExit` but can keep the Node event loop alive unless
  the actual CLI binary calls `process.exit`. The CLI entrypoint now exits
  explicitly after `main()` resolves, and `runWrap` also cleans up PTY
  subscriptions plus resumed stdin forwarding. Verification passed:
  focused `index.test.ts` + `wrap.test.ts` (27 tests), full CLI tests (12 files /
  100 tests), CLI typecheck, and `corepack pnpm@9.12.0 smoke:local-cli` with
  `cli={"exitCode":0,"renderedLocalAd":true}`.

Focused verification for the direct functional questions passed on 2026-06-16:

- Web:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/track/route.test.ts src/app/api/ad/route.test.ts src/app/api/click/route.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/market/route.test.ts src/app/api/campaigns/route.test.ts src/app/api/checkout-status/route.test.ts src/app/api/payouts/status/route.test.ts src/app/api/payouts/withdraw/route.test.ts src/app/api/payouts/connect/route.test.ts`
  passed with 42 tests.
- CLI:
  `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/renderer.test.ts src/wrap.test.ts src/claude-code-adapter.test.ts src/api-client.test.ts`
  passed with 59 tests.

Local RTDB hot counter isolation update:

- Fixed the P0 local isolation gap above.
- `resolveRtdbRootPath(env, mode)` keeps production on the default
  `spinshare/hot` root unless `SPINSHARE_RTDB_ROOT_PATH` is explicitly set.
- Local mode with RTDB now derives the hot root from
  `SPINSHARE_FIRESTORE_NAMESPACE`, or from `local` when the Firestore namespace
  is unset:
  `spinshare/namespaces/<namespace>/hot`.
- `buildCounterStore()` passes the resolved root to `RealtimeDbCounterStore`, so
  local pending ledger, balances, campaign budget deltas, velocity, and campaign
  telemetry no longer hit the shared RTDB hot tree by default.
- RED/GREEN verification:
  - RED focused `container.test.ts` failed because `resolveRtdbRootPath` did not
    exist.
  - GREEN focused `container.test.ts` passed with 11 tests.

Destination URL anti-phishing hardening update:

- `destinationUrlSchema` now rejects punycode/IDN hostnames, single-label
  hostnames, and common URL shorteners such as `bit.ly`, `tinyurl.com`, and
  `t.co`.
- Public homepage checkout and authenticated dashboard campaign creation inherit
  this through the shared core schema.
- This is still only the deterministic synchronous layer; LLM/reputation or
  landing-page review remains future work for borderline safe-looking domains.
- RED/GREEN verification:
  - RED focused `schemas.test.ts` failed because at least one phishing-prone or
    review-bypass URL was accepted.
  - GREEN focused `schemas.test.ts` passed with 24 tests.

Deterministic ad text safety gate update:

- `@spinshare/core` now exports `reviewAdTextSafety(adText)` and wires it into
  `adTextSchema`.
- Public homepage checkout and authenticated dashboard campaign creation inherit
  the same deterministic first-pass safety gate.
- The gate blocks clearly unsafe copy before campaign creation or payment:
  seed phrase/private key collection, password/OTP collection, crypto
  giveaway/airdrop lures, and wallet/account/login verification lures.
- RED/GREEN verification:
  - RED core schema test failed because unsafe copy was accepted and
    `reviewAdTextSafety` did not exist.
  - RED web route tests failed because public checkout returned `200` and
    authenticated creation returned `201`.
  - GREEN core focused test passed, then after rebuilding core the focused web
    route tests passed.
- This is only the deterministic first layer. Async LLM/reputation review for
  borderline ad copy and landing-page content remains future work.

Activity ledger detail disclosure update:

- Shared `activityDetailItems(row, { amountLabel })` now formats ledger detail
  fields for advertiser and developer UIs.
- Advertiser activity rows expose a compact `Details` disclosure with activity
  id, campaign id, status, event/duration, amount, created timestamp, and Stripe
  checkout/provider ids when present.
- Developer mobile cards and desktop table rows expose the same details, using
  `Credit` as the amount label.
- Focused RED/GREEN verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx`.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- Local external preflight remains blocked by missing Stripe CLI and Java 8:
  `corepack pnpm@9.12.0 verify:local-runtime` fails at `command.stripe` and
  `java.version`.

Checkout status diagnostics update:

- Root cause observability gap found: success URLs carried
  `checkout_session_id=cs_...`, but SpinShare had no API to resolve that id
  back to checkout/funding/campaign state.
- `ActivityRepository` now supports `listByCheckoutSessionId(sessionId)`.
  Memory and Firestore adapters implement it and return advertiser events only.
- Added public low-information `GET /api/checkout-status?checkout_session_id=cs_...`.
  It reports `unknown`, `pending_webhook`, or `funded` and includes only
  campaign id, budget cents, public leaderboard flag, biddable flag, and
  leaderboard eligibility.
- Focused RED/GREEN verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/checkout-status/route.test.ts src/server/adapters/memory/memory-activity-repository.test.ts`.
- Related checkout/payment/market regression passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/checkout-status/route.test.ts src/server/adapters/memory/memory-activity-repository.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts src/app/api/webhooks/stripe/route.test.ts src/app/api/activity/advertiser/route.test.ts src/app/api/market/route.test.ts`.
- Full regression/typecheck passed:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

Stripe webhook funding hardening update:

- Root cause risk found in the paid-checkout visibility path: webhook funding
  claimed the Stripe event id before proving the campaign existed. If applying
  budget failed after that point, the event could be recorded as applied while
  the campaign stayed unfunded and invisible on `/api/market`.
- `/api/webhooks/stripe` now validates funding payloads before idempotency
  claim. Missing campaigns return a retryable `500` without marking the payment
  event applied; empty campaign ids or non-positive amounts are ignored without
  mutation.
- `StripeEvent` now carries optional `checkoutSessionId`. `StripeGateway` fills
  it from `session.id`, the mock gateway preserves it, and `budgetFunded`
  advertiser activity writes it for post-checkout diagnostics.
- Focused webhook/gateway verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/webhooks/stripe/route.test.ts src/server/adapters/stripe/stripe-gateway.test.ts`.
- Related payment/market/activity regression passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/webhooks/stripe/route.test.ts src/app/api/webhooks/stripe/payment.property.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts src/app/api/market/route.test.ts src/app/api/activity/advertiser/route.test.ts src/server/adapters/stripe/stripe-gateway.test.ts`.
- Full regression/typecheck passed:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.
- Real Stripe test/live checkout still requires webhook delivery to the same
  storage environment before a paid campaign appears on the leaderboard.

Same-email public campaign funding update:

- Root cause found for visible homepage-purchased campaigns failing dashboard
  Add Funds: homepage checkout campaigns are owned by
  `publicAdvertiserIdForEmail(email)`, but `/api/funds/checkout` authorized only
  `claims.userId`.
- `/api/funds/checkout` now authorizes a campaign when its owner matches either
  the authenticated `claims.userId` or the same-email public advertiser id.
- This keeps the non-owner `403` boundary and makes the homepage purchase model
  consistent with advertiser dashboard block purchases.
- Focused RED/GREEN verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/funds/checkout/route.test.ts`.
- Related dashboard/claim regression passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/funds/checkout/route.test.ts src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/page.test.tsx`.
- Full regression/typecheck passed after the final workspace state:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.
- Path-scoped `git diff --check` passed for the files touched in this
  investigation, with only CRLF conversion warnings.
- Leaderboard still depends on Stripe webhook funding: `/api/market` only shows
  campaigns with `budgetCents > 0`; test/live Checkout does not fund until
  `/api/webhooks/stripe` receives `checkout.session.completed`.
- Current local preflight still fails because `stripe` is not on PATH and Java
  is `1.8.0_491`, below the Firestore emulator requirement.

Advertiser dashboard claim fix:

- Root cause found for homepage purchase not appearing in advertiser dashboard:
  dashboard bearer tokens were minted with only `userId`, while homepage
  checkout campaigns are claimable by same-email public advertiser id.
- `/dashboard/advertiser/page.tsx` now passes `session.user.email` and
  `role: "advertiser"` into the dashboard token.
- `NextAuthDeviceProvider.mintToken()` now preserves optional claims, matching
  the mock provider's direct-mint behavior.
- Focused RED/GREEN verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/page.test.tsx src/server/adapters/auth/nextauth-device-provider.test.ts src/app/api/campaigns/route.test.ts`.
- Full regression passed after the fix:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.
- Leaderboard still depends on Stripe webhook funding: `/api/market` only shows
  campaigns with `budgetCents > 0`; test/live Checkout does not fund until
  `/api/webhooks/stripe` receives `checkout.session.completed`.
- Current local preflight still fails because `stripe` is not on PATH and Java
  is `1.8.0_491`, below the Firestore emulator requirement.

Checkout return session context update:

- Public homepage checkout and dashboard funding success URLs now include
  `checkout_session_id={CHECKOUT_SESSION_ID}`.
- The mock payment gateway now replaces Stripe's placeholder with the generated
  mock session id, so localhost redirect URLs carry session context too.
- This does not fund campaigns by itself; funding still requires mock settlement
  or a real Stripe webhook. It gives us the session id needed for pending-payment
  diagnostics and future post-checkout UI.
- Focused RED/GREEN verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-adapters.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts`.
- Full regression passed after the update:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

Activity ledger pagination update:

- Developer and advertiser activity APIs now return bounded newest-first pages
  with `limit`, `cursor`, and optional `nextCursor`.
- Pagination is route-level for now because the repository interface still
  exposes full-list reads; it can be pushed into Firestore queries later without
  changing the API contract.
- `docs/project-status.md` now distinguishes completed API/dashboard work from
  remaining ledger product work: advertiser/developer load-more and export are
  implemented, advertiser filtering and developer search are implemented, and the
  remaining product work is detail drill-down plus clearer status explanations.
- Focused verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/activity/developer/route.test.ts src/app/api/activity/advertiser/route.test.ts`.
- Full regression passed after the pagination update:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

This mirror records the latest project-status changes. Previous update recorded
the dashboard activity ledger UI implementation:

- Developer dashboard activity reads attempt-level activity rows.
- Advertiser dashboard loads `/api/activity/advertiser` and renders a Recent activity feed.
- Shared formatting and newest-first sorting live in `web/src/app/dashboard/activity-feed.ts`.
- Full regression verification passed with `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.
- Payment, webhook, and budget debit events are still not unified into one full activity timeline.

Latest cumulative viewability update:

- Core accepts positive short view segments while keeping 3000 ms as the
  settlement threshold.
- Web stores per-developer pending impression progress and settles only after
  cumulative duration reaches 3000 ms.
- CLI and VS Code clients now parse progress-only responses and report short
  segments instead of discarding them.
- Focused core/web/CLI/extension tests passed for the cumulative model.
- Full root regression and lint/typecheck passed after the cumulative change:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.
- Firestore emulator/test-namespace verification and real Claude Code TUI
  manual verification are still pending.

Advertiser money activity ledger update:

- Advertiser activity is now a unified timeline that includes impression
  attempts plus `checkoutStarted`, `budgetFunded`, and `budgetDebited` events.
- Public checkout, dashboard Add Funds, Stripe webhook funding, and credited
  impressions write best-effort advertiser activity rows.
- Stripe webhook funding activity is idempotent with the existing payment event
  claim.
- Focused web tests, full web tests, root tests, and root lint/typecheck passed
  after this update.
- Firestore emulator/test-namespace verification and real Claude Code TUI
  manual verification remain pending.

Local Firestore isolation update:

- `SPINSHARE_FIRESTORE_NAMESPACE=test` is covered for every Firestore collection
  path, including activity/progress/payment-event collections.
- Local cloud Firestore opt-in now fails fast without a namespace, preventing
  localhost writes to top-level production collections.
- Firestore emulator selection remains allowed without namespace.
- Focused verification passed for `container.test.ts` and
  `collections.test.ts`.
- Real emulator write-through, Stripe CLI webhook, and real Claude Code TUI
  manual verification remain pending.

Claude Code adapter cumulative/statusLine update:

- Generated Claude hooks now require a local token before fetching/showing ads.
- Generated Claude hooks report positive short view segments instead of dropping
  `< 3000 ms` segments; backend cumulative progress remains the settlement
  source of truth.
- Generated statusLine settings now use `refreshInterval: 1` and the displayed
  ad text uses an ASCII `$ ` prefix.
- Generated hook/statusLine scripts read Claude stdin JSON and bind active ad
  state to `session_id` to avoid stale cross-session display/tracking.
- Focused adapter tests, full extension tests, and extension typecheck passed.
- Real Claude Code TUI behavior is still pending manual verification.

Status cleanup update:

- `docs/project-status.md` was corrected so implemented items are no longer
  described as missing: `/api/funds/checkout` core fixes, cumulative billing
  code path, Claude Code adapter static implementation, and advertiser money
  activity events.
- Remaining work is now framed as product polish or external runtime
  verification, not as the old missing-code diagnosis.

npm CLI Claude Code setup update:

- The npm CLI now has its own Claude Code adapter installer.
- `spinshare setup claude-code` explicitly installs hooks/statusLine.
- `spinshare login` mirrors the token to the file credential path and installs
  the adapter best-effort after successful login.
- Focused CLI tests passed for adapter generation, login post-setup, and setup
  argument parsing.
- CLI package build passed and the built `dist/index.js --help` output includes
  `spinshare setup claude-code`.
- Real global npm install and real Claude Code TUI verification remain pending.

Authenticated Claude ad fetch update:

- Generated Claude hook scripts in both extension and npm CLI adapters now send
  Authorization on `GET /api/ad`.
- This preserves cumulative pending-ad continuity: after a short segment is
  recorded, the next Claude turn can receive the same pending campaign for that
  developer before normal bidding.
- Focused adapter tests passed for both packages.

Claude direct-launch boundary update:

- The VS Code/Cursor/Trae terminal shim now treats `claude` as a native adapter
  agent instead of routing it through `spinshare claude`.
- The generated launcher still removes its shim directory from `PATH`, sets
  SpinShare base URL env vars, and then direct-launches the real `claude` with
  inherited stdio.
- Non-native configured agents still use the old SpinShare CLI wrapper fallback.
- This keeps Claude Code MVP ads on the official hooks/statusLine path and
  prevents the stdout/spinner guesser from running at the same time.
- The generated VS Code Claude statusLine script no longer contains the unused
  non-ASCII `▣ ` marker; visible output uses the ASCII `$ ` prefix.
- Focused terminal/adapter tests passed for these boundaries.

Generated Claude script runtime verification update:

- Added runtime smoke tests for both extension and npm CLI generated Claude
  hook/statusLine scripts.
- The tests execute generated `.cjs` files with real Node child processes,
  feed Claude-like stdin JSON with `session_id`, and use a local HTTP server for
  `/api/ad` and `/api/track`.
- Verified behavior includes bearer Authorization on fetch/track, state file
  persistence, session-gated statusLine display, positive view-duration
  tracking on Stop, and state cleanup.
- Root regression and typecheck passed after adding the runtime smoke tests:
  `corepack pnpm@9.12.0 test`, `corepack pnpm@9.12.0 lint`, and
  `git diff --check` (CRLF warnings only).
- This reduces generated-script risk but still leaves real Claude Code TUI hook
  firing and rendering as manual external verification.

Duplicate Claude adapter cleanup update:

- Found a billing safety bug in the extension+npm dual-install path: both
  installers can patch `~/.claude/settings.json` with different generated
  SpinShare hook paths.
- Previous merge logic only deduplicated the exact current command, leaving old
  `spinshare-hook.cjs` commands from another installer active. This could make
  one Claude turn fetch/report ads twice, including a report for a surface that
  was no longer displayed by the current statusLine.
- Both adapter implementations now identify SpinShare-owned commands by
  generated script names (`spinshare-hook.cjs`, `spinshare-statusline.cjs`).
  Merge removes old SpinShare hook commands before adding the current adapter;
  removal deletes all SpinShare-owned hook/statusLine entries while preserving
  unrelated user hooks/settings.
- RED/GREEN focused verification passed for both adapter packages:
  `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/claude-code-adapter.test.ts`
  and
  `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts`.
- Full regression and publish/package checks passed after this focused fix:
  `corepack pnpm@9.12.0 test`, `corepack pnpm@9.12.0 lint`,
  `corepack pnpm@9.12.0 --filter ./vscode-extension package`,
  `npm.cmd publish --dry-run` with a workspace-local npm cache, and
  `git diff --check` with only CRLF warnings.
- Compiled/package artifact spot checks found the cleanup logic in the extension
  output, root CLI dist, and bundled VSIX CLI dist.
- Real runtime preflight still fails only on external dependencies: Stripe CLI
  is missing and Java is `1.8.0_491`, below the Firestore emulator requirement.
- Real Claude Code TUI behavior and external Stripe/Firestore end-to-end
  verification remain pending.

Same-session Claude stale state update:

- Found another generated-hook billing safety bug: matching active state for the
  same Claude `session_id` was reused across `UserPromptSubmit`, so a missed
  Stop hook could make the next prompt inherit an old campaign and old
  `startedAtMs`.
- Both extension and npm CLI generated hook templates now treat
  `UserPromptSubmit` as a new turn boundary. It clears existing active state and
  fetches a fresh ad. `MessageDisplay` still reuses matching active state to
  avoid same-turn double fetches.
- Runtime RED/GREEN tests now execute two same-session `UserPromptSubmit`
  events, prove `/api/ad` is called again, and prove Stop reports the fresh
  campaign.
- Full regression, lint, VSIX package, npm dry-run, diff check, and compiled
  artifact spot checks passed after this fix.
- Runtime preflight still fails only on external dependencies: Stripe CLI is
  missing and Java is `1.8.0_491`, below the Firestore emulator requirement.

Extension existing-token mirror sync update:

- Found a VS Code/Cursor/Trae account-sync bug: generated Claude hooks read the
  CLI-compatible credentials file, but existing extension users may already be
  signed in only through VS Code SecretStorage.
- `AuthManager.initialize()` now best-effort mirrors any non-empty token loaded
  from SecretStorage into the configured file mirror. Missing SecretStorage
  tokens do not clear the shared file credential, because that file may belong
  to a standalone npm CLI login.
- RED/GREEN focused verification passed in `vscode-extension/`:
  `corepack pnpm@9.12.0 test -- src/auth.test.ts`.
- Full regression, lint, VSIX package, npm dry-run, diff check, and compiled
  artifact spot checks passed after this fix.
- Runtime preflight still fails only on external dependencies: Stripe CLI is
  missing and Java is `1.8.0_491`, below the Firestore emulator requirement.

Local external runtime preflight update:

- Added `corepack pnpm@9.12.0 verify:local-runtime`.
- The preflight checks Node, `claude`, `stripe`, `firebase`, `npx`, Java for the
  Firestore emulator, and local Firestore isolation.
- Focused preflight unit tests pass.
- Real machine result on 2026-06-15: Claude Code is installed (`2.1.170`),
  Firebase CLI is installed (`14.26.0`), Stripe CLI is missing, and Java is
  `1.8.0_491`.
- A real `spinshare setup claude-code` install succeeded and patched
  `C:\Users\noahz\.claude\settings.json`; backup and generated script files
  exist, and settings do not contain the token.
- Firestore emulator verification is blocked by Java 8:
  `UnsupportedClassVersionError` for class file version 55.0. Install JDK 21
  before continuing emulator verification.

Install/sign-in, statusLine ad polish, and URL safety update:

- Fresh extension installs now expose a persistent status bar sign-in entry
  when no token is stored. The entry runs `spinshare.signIn`, hides after
  successful sign-in, and returns after sign-out.
- Generated Claude Code statusLine ads are now bold cyan and remain OSC8
  hyperlink-wrapped when `destinationUrl` is present.
- Claude Code controls the physical statusLine placement; SpinShare cannot
  force the ad directly under `Thinking...` through the statusLine API.
- `destinationUrlSchema` now rejects credentialed URLs, localhost/.local hosts,
  IP literal destinations, and custom ports before campaign creation or public
  checkout.
- `/api/click` now reuses the same destination safety gate before redirecting
  or counting a click, so unsafe historical campaign destinations fall back to
  the site root.
- Root `test` and `lint` now rebuild `@spinshare/core` before running
  consumer packages, preventing stale `packages/core/dist` from giving false
  green results after core contract changes.
- LLM-based ad review should be a second layer after deterministic URL policy
  and reputation checks, not the sole safety gate.
- Full regression passed after the update:
  `corepack pnpm@9.12.0 test`, `corepack pnpm@9.12.0 lint`, and
  `corepack pnpm@9.12.0 --filter ./vscode-extension package`.
- Workspace-wide `git diff --check` still reports unrelated pre-existing
  whitespace in `web/src/app/page.tsx`, `web/src/app/home.css`, and
  `.ai/web/src/app/api/track/route.test.md`; path-scoped diff check for this
  update's files passed.

Dashboard block-purchase funding update:

- Advertiser dashboard funding now uses block purchases instead of arbitrary
  USD top-ups.
- `fundingBlockCheckoutSchema` validates `{ campaignId, blockCount }`.
- `/api/funds/checkout` derives checkout amount from the owned campaign's CPM
  and block count, rejects legacy amount-only payloads, and enforces the
  derived funding maximum.
- `CampaignList` renders "Buy blocks", explains that one block equals 1,000
  impressions, validates whole block counts, and sends `blockCount`.
- Focused core/web checks, root `test`, and root `lint` passed after the
  update.

Claude Code adapter removal update:

- npm CLI now supports `spinshare setup claude-code --remove`.
- VS Code/Cursor/Trae extension now contributes `SpinShare: Remove Claude Code
  Adapter`.
- Setting `spinshare.claudeCodeAdapter=false` removes the current adapter rather
  than only preventing future installs.
- Removal deletes only SpinShare statusLine/hooks, preserves unrelated Claude
  settings and hook handlers, and best-effort removes generated adapter files.
- Follow-up bug fix: CLI/extension adapter parsing now strips a UTF-8 BOM before
  `JSON.parse`, preventing Windows PowerShell-authored Claude settings from
  being treated as invalid and overwritten.
- The rebuilt `spinshare-0.2.0.vsix` was inspected and contains the extension
  remove command, bundled CLI `setup claude-code --remove`, and BOM-safe parser.
- npm CLI publishability update: `cli-wrapper/package.json` is no longer
  private, `bin.spinshare` is normalized to `dist/index.js`, runtime
  dependencies contain no `workspace:*`, and `npm publish --dry-run` passes
  until the expected npm-login boundary.

Legacy CLI authenticated ad fetch update:

- Found a fallback-wrapper billing safety bug: `CliApiClient.getAd()` could call
  the public `/api/ad` endpoint without a bearer token. That allowed the old
  generic stdout/spinner wrapper to display an ad anonymously, while the later
  `/api/track` call could not attribute or settle the impression.
- `CliApiClient.getAd()` now returns `{ adAvailable: false }` without calling
  `fetch` when no token is available. Login/device-flow APIs remain
  unauthenticated.
- RED/GREEN focused verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/api-client.test.ts`.
- Full follow-up verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/cli test`,
  `corepack pnpm@9.12.0 test`, `corepack pnpm@9.12.0 lint`,
  `corepack pnpm@9.12.0 --filter ./vscode-extension package`,
  `npm.cmd publish --dry-run`, and `git diff --check` with CRLF warnings only.
- Runtime preflight still fails only on external dependencies: Stripe CLI is not
  on `PATH`, and Java is `1.8.0_491`.

Backend ad-serving auth boundary update:

- Found the matching server-side boundary bug: `/api/ad` still allowed missing
  or invalid bearer tokens to enter bidding.
- `GET /api/ad` now returns `401 { "error": "Unauthorized" }` before bidding,
  pending-progress selection, click URL rewriting, or `shows` telemetry unless
  a valid device token resolves to developer claims.
- RED/GREEN focused verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/ad/route.test.ts`.
- Full web regression passed: `corepack pnpm@9.12.0 --filter @spinshare/web test`.
- Full root regression and lint/typecheck passed: `corepack pnpm@9.12.0 test`
  and `corepack pnpm@9.12.0 lint`.

Extension ad-fetch token gate update:

- The VS Code/Cursor/Trae extension API client now mirrors the server boundary:
  `getAd()` returns `{ adAvailable:false }` without fetching when no token is
  present.
- RED/GREEN focused verification passed:
  `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/api-client.test.ts`.
- Full extension suite, root regression, lint/typecheck, VSIX package rebuild,
  and compiled artifact spot checks passed.

Served-marker track validation update:

- Found a ledger safety bug: authenticated track requests could name any funded
  campaign without proof that `/api/ad` served that campaign to that developer.
- Authenticated `/api/ad` now writes a 0ms pending marker for the selected
  developer/campaign.
- `/api/track` now requires a matching pending marker before adding duration or
  settling money; missing/mismatched markers return the existing invalid
  campaign 422 and record invalid-campaign telemetry/activity.
- RED/GREEN focused verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/ad/route.test.ts src/app/api/track/route.test.ts`.
- Full web/root/lint verification passed after implementation.

Checkout visibility update:

- Stripe test Checkout success is not enough to make an ad appear on the
  leaderboard. In `STRIPE_MODE=test/live`, campaign budget is applied only when
  `checkout.session.completed` reaches `/api/webhooks/stripe` and writes to
  the same storage namespace read by `/api/market` and the dashboard.
- The homepage now has a post-return diagnostic surface:
  `CheckoutStatusBanner` reads `checkout_session_id` after Stripe redirects and
  calls `GET /api/checkout-status?checkout_session_id=cs_...`.
- The banner explains `pending_webhook`, `funded`, `unknown`, cancelled, and
  error states, including whether the campaign is public-leaderboard eligible.
- The advertiser dashboard now mounts the same status banner below the hero,
  and the parser accepts `funding=success|cancelled` so dashboard Add Funds
  redirects get the same status explanation.
- The banner polls pending/unknown states every 2 seconds for up to 15 attempts
  so ordinary webhook latency can resolve without a manual refresh.
- Focused verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/checkout-status-banner.test.tsx src/app/page.test.tsx`
  and the dashboard/payment focused suite, plus
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.

Exact local Stripe test diagnosis:

- The diagnosed local `.env` was a hybrid: `SPINSHARE_MODE=local`,
  `AUTH_MODE=oauth`, `STRIPE_MODE=test`, with no durable Firestore selection or
  namespace. In that mode, homepage checkout campaigns were created in
  process-local memory with `budgetCents=0`, while Stripe Checkout itself was
  real test mode.
- `buildContainer()` and `verify:local-runtime` now guard against local
  `STRIPE_MODE=test|live` with memory durable storage. Local real-Stripe testing
  must use Firestore emulator or namespace-isolated Firestore.
- The campaign becomes biddable only after `checkout.session.completed` reaches
  `/api/webhooks/stripe` or checkout-status reconciliation applies a paid
  provider session in that same durable storage namespace.
- `/api/market` reads only biddable campaigns (`budgetCents > 0` and
  `cpmCents > 0`), so a paid Checkout Session with no delivered webhook will
  not appear on the leaderboard.
- Advertiser dashboard same-email claim is now supported because the dashboard
  bearer token includes `session.user.email`. Remaining invisibility usually
  means the dev server lost the memory campaign, the login email differs from
  the checkout email, or the payment happened in a different environment or
  Firestore namespace than the dashboard is reading.
- Real local Stripe test requires Stripe CLI forwarding to
  `http://localhost:3000/api/webhooks/stripe`, the CLI-provided local
  `STRIPE_WEBHOOK_SECRET`, and one consistent storage mode: pure mock, Firestore
  emulator, or namespaced cloud Firestore.
- Current preflight on 2026-06-16 fails because `stripe` is not on `PATH` and
  Java is `1.8.0_491`; it also reports that local Firestore is not enabled.

Advertiser activity load-more UI update:

- Advertiser activity APIs already returned `nextCursor`, but the dashboard
  context discarded it and the UI could not request older rows.
- `AdvertiserDashboardProviderClient` now keeps the cursor, exposes
  `loadMoreActivity()`, and uses `mergeActivityRows()` to append de-duplicated
  pages.
- `AdvertiserActivityFeed` now renders the load-more control, keeps existing
  rows visible while loading, and shows inline load-more errors.
- Focused verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx`.

Advertiser activity filter/export update:

- The advertiser activity feed now includes search, all/billable/no-charge/
  payment filters, and CSV export for the currently visible rows.
- Filtering is covered by `filterAdvertiserActivityRows()` and CSV output by
  `advertiserActivityRowsToCsv()`.
- Search normalizes punctuation/underscores so user queries like `no charge`
  can match campaign ids such as `cmp_no_charge`.
- Focused RED/GREEN verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx`.
- Typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.

Developer activity filter/export update:

- The developer activity page now exports visible ledger rows as CSV.
- Filtering is covered by `filterDeveloperActivityRows()` and CSV output by
  `developerActivityRowsToCsv()`.
- Search normalizes punctuation/underscores so user queries like `no charge`
  can match campaign ids such as `cmp_no_charge`.
- Focused RED/GREEN verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/developer-activity-view.test.tsx`.
- Related activity verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/developer-activity-view.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts src/app/api/activity/developer/route.test.ts src/app/api/activity/advertiser/route.test.ts`.
- Full regression/typecheck passed after this update:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

Extension prod/local packaging update:

- The "no ads" symptom is most likely env/auth rather than lack of ad logic:
  `/api/ad` requires bearer auth, local sample ads require
  `SPINSHARE_SEED_LOCAL_DATA=1`, and the default packaged extension pointed to
  production unless `spinshare.baseUrl` was manually changed.
- Added root `dev:sample` to start local web with mock auth/payment, memory
  storage, and seeded sample ads.
- Added VSIX variants:
  `spinshare-prod-0.2.0.vsix` defaults to `https://www.spinshare.dev`, and
  `spinshare-local-0.2.0.vsix` uses display name `SpinShare Local` and defaults
  to `http://localhost:3000`.
- Both artifacts intentionally keep one extension id for now; installing local
  replaces prod to avoid duplicate command ids and Claude adapter conflicts.
- Extension SecretStorage tokens are now scoped by normalized
  `spinshare.baseUrl`, so local does not reuse prod tokens. Production migrates
  the legacy token key for upgrade compatibility.
- Verification passed:
  focused RED/GREEN tests for package/sample helpers, `package:all`, VSIX
  manifest/compiled artifact inspection, full `corepack pnpm@9.12.0 test`, and
  full `corepack pnpm@9.12.0 lint`.

Extension activation sign-in prompt coverage:

- Confirmed the extension activation path creates the persistent sign-in status
  bar item and also calls `AuthManager.ensureAuthenticated()` when no token is
  loaded. That means fresh installs are intended to prompt browser/device
  sign-in immediately, not only after a manual command.
- Added regression coverage in `vscode-extension/src/extension.test.ts` so this
  install-time sign-in contract is locked separately from the fallback status
  bar button.
- Focused verification passed:
  `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/extension.test.ts`.

Local sample dev launcher Windows fix:

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

Local sample credentials sign-in fix:

- Found a localhost-only auth break in the extension sample flow:
  `dev:sample` uses `AUTH_MODE=mock`, but `/activate` still requires a browser
  session and `/signin` was OAuth-only. Without Google/GitHub credentials, the
  local VSIX could open the browser but never approve the device code, so
  authenticated `/api/ad` returned no sample ads.
- Added a local-only credentials shortcut behind
  `NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS=1`. The UI uses only the fixed local
  developer/advertiser accounts and calls the real NextAuth Credentials
  provider.
- `dev:sample` now sets that public flag, so local VSIX testing has a complete
  sign-in path without OAuth credentials. Production remains OAuth-only by
  default.
- RED/GREEN verification passed:
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/signin/page.test.ts`
    failed because the local credentials helpers did not exist.
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\dev-local-sample.test.mjs`
    failed because the launcher did not set the public flag.
  - GREEN: both focused commands passed after implementation.

LearnX local seed removal:

- Replaced the explicit local seed campaign from LearnX to a clearly local
  sample:
  - `brandName: "SpinShare Local"`
  - `adText: "SpinShare Local - sample ad for localhost testing"`
  - `destinationUrl: "https://www.spinshare.dev"`
- The sample campaign is still default-off and only appears when
  `SPINSHARE_SEED_LOCAL_DATA=1`, which `dev:sample` sets for localhost testing.
- RED/GREEN verification passed:
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/container.test.ts`
    failed because the explicit seed still returned LearnX.
  - GREEN: the same focused command passed after replacing the seed data.

Local runtime preflight credentials warning:

- Added `checkLocalCredentialsShortcut(env)` to
  `web/scripts/verify-local-runtime-core.mjs`.
- When `SPINSHARE_MODE=local` and `AUTH_MODE=mock`, preflight now warns if
  `NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS` is not `1`. That catches the local
  failure mode where `/activate` opens but `/signin` hides the local test
  account shortcut.
- The result is warning severity, so it diagnoses local sample auth without
  blocking unrelated checks.
- RED/GREEN verification passed:
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- ..\web\scripts\verify-local-runtime.test.mjs`
    failed because the helper and aggregate check did not exist.
  - GREEN: the same focused command passed with 12 tests.

Stripe checkout return reconciliation:

- Root cause for the Stripe-test visibility bug was the environment combination:
  `.env` used `SPINSHARE_MODE=local` and `STRIPE_MODE=test` while durable
  campaign/payment repos remained in memory. A real Stripe Checkout could
  complete, but without webhook forwarding into the same localhost process the
  campaign remained `budgetCents=0` and was correctly absent from the
  leaderboard.
- `GET /api/checkout-status` now performs a safe fallback reconciliation:
  when local checkout activity exists and funding is still pending, it asks the
  payment gateway for the provider-verified Checkout Session funding state.
  It only applies funding for a paid session that matches the local campaign
  and has a positive amount.
- Webhook and fallback funding share the idempotency key
  `checkout_session:{sessionId}` to prevent double-credit when the user returns
  before the webhook arrives.
- `PaymentGateway.retrieveCheckoutSessionFunding(sessionId)` is implemented by
  Stripe and the mock gateway.
- The sign-in page now infers Advertiser from
  `callbackUrl=/dashboard/advertiser`, fixing the post-purchase dashboard
  role default.
- `verify:local-runtime` now includes `checkLocalStripeDurability(env)`, which
  fails local real-Stripe + memory-storage configs and points to mock Stripe,
  Firestore emulator, or namespace-isolated Firestore.
- RED/GREEN focused verification passed for sign-in, preflight,
  Stripe/mock gateway, checkout-status, and webhook route tests.
- Full regression verification passed:
  - `corepack pnpm@9.12.0 test`
  - `corepack pnpm@9.12.0 lint`
- `verify:local-runtime` now intentionally fails for this workstation because
  Stripe CLI is missing and Java is 8. The old local real-Stripe plus memory
  durable storage pairing is now guarded against.

Extension no-ads / prod-local diagnosis:

- Current installed VS Code Claude Code hook and terminal launcher both point
  to `https://www.spinshare.dev`, not localhost. The user is currently testing
  the production extension path, not the local sample ad path.
- `http://localhost:3000/api/ad` was unreachable during diagnosis, so the local
  sample server was not running. Local ads require
  `corepack pnpm@9.12.0 dev:sample`.
- Production `/api/ad` with the locally mirrored token returned `401`, which
  means the extension has a stored token string that the server no longer
  accepts. Because `AuthManager.isAuthenticated()` checks token presence only,
  the extension hides sign-in and the Claude hook silently shows no ad.
- This is not a reason to roll back to the old spinner wrapper. The correct fix
  is to add side-effect-free token validation and clear/prompt on invalid stored
  tokens.
- Planned code files for the next fix: web auth validation route, extension
  API client, extension auth activation behavior, plus focused RED/GREEN tests.

Extension invalid-token / prod-local credential fix:

- Implemented `GET /api/auth/device/validate` as a side-effect-free bearer
  token health check. It returns `200 { valid: true }` for valid tokens and
  `401 { valid: false }` for missing/invalid tokens without bidding, progress
  writes, or ad telemetry.
- `vscode-extension/src/api-client.ts` now has `validateDeviceToken()`, and
  `AuthManager.initialize()` validates stored scoped tokens on activation.
  Explicitly invalid tokens clear the current baseUrl-scoped SecretStorage key,
  configured legacy keys, and the shared Claude hook credential file so the
  extension prompts sign-in again.
- Extension and npm CLI credential mirroring now write `baseUrl` metadata.
  Generated Claude hooks ignore file credentials whose `baseUrl` does not
  match the hook's configured API. Legacy credentials without `baseUrl` are
  rejected when the target API is known, so ambiguous old tokens force re-login
  instead of defaulting to production.
- Focused verification passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/auth/device/validate/route.test.ts`
    passed with 2 tests.
  - `corepack pnpm@9.12.0 --filter ./vscode-extension test -- src/api-client.test.ts src/auth.test.ts src/claude-code-adapter.test.ts`
    passed with 39 tests.
  - `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/credential-store.test.ts src/claude-code-adapter.test.ts`
    passed with 19 tests.
  - package/local sample helper tests passed.
- Packaging passed:
  `corepack pnpm@9.12.0 --filter ./vscode-extension package:all` rebuilt
  `spinshare-prod-0.2.0.vsix` and `spinshare-local-0.2.0.vsix`.
- VSIX spot check passed: prod defaults to `https://www.spinshare.dev`, local
  defaults to `http://localhost:3000`, and both packages contain token
  validation plus baseUrl-aware hook credential filtering.
- Full regression/typecheck passed after packaging:
  - `corepack pnpm@9.12.0 test` passed across core, web, CLI, and extension:
    core 38 tests, web 249 passed / 1 skipped, CLI 97 tests, extension 67
    tests.
  - `corepack pnpm@9.12.0 lint` passed across core, web, CLI, and extension
    TypeScript checks.
- Local runtime smoke passed with `corepack pnpm@9.12.0 dev:sample`:
  - `GET http://localhost:3000/api/market` returned 1 live row with
    `adText: "SpinShare Local - sample ad for localhost testing"` and `$50.00`
    remaining budget.
  - `POST http://localhost:3000/api/auth/device/start` returned a device code
    and a `verificationUriComplete` under `http://localhost:3000/activate`.
  - The temporary dev server was stopped after the smoke check; no listener
    remained on port 3000.

Product reality check: dashboard, ranking, payout, clicks:

- Developer earnings dashboard: read-time catch-up now exists, but scheduled
  flush is still required for unattended reconciliation.
  `/api/track` accumulates viewability and only settles after cumulative 3s.
  Settlement credits the hot counter store and queues a pending ledger entry.
  The developer dashboard reads durable Firestore ledger entries through
  `container.ledger.listByDeveloper()` and `summarizeLedger()`, but now calls
  `flushPendingForRead(container, "developer-dashboard")` before the ledger
  read. Production now has protected `POST /api/internal/flush`, which validates a bearer
  `SPINSHARE_FLUSH_SECRET`/`CRON_SECRET` before calling `runFlushCycle()`.
  A Cloud Scheduler or equivalent external scheduler still must call it at most
  once per minute for unattended reconciliation. Dashboard and payout status
  reads can still lag if the one-cycle best-effort flush fails or the pending
  queue is larger than one batch.
- Homepage payment to ranking: yes after funding. Homepage checkout creates a
  campaign at `budgetCents = 0`; the campaign enters `/api/market` only after
  webhook or `/api/checkout-status` reconciliation applies funding so
  `budgetCents > 0`. The homepage polls checkout status every 2s up to 15
  times after Stripe return.
- Homepage payment to extension ads: yes after funding, provided the extension
  is authenticated against the same environment. `/api/ad` requires a valid
  bearer device token, selects biddable campaigns (`budgetCents > 0`,
  `cpmCents > 0`), and may keep returning a developer's pending incomplete
  campaign until cumulative viewability settles.
- Advertiser dashboard impressions: partially yes. `/api/ad` increments
  `shows`; `/api/track` increments credited/non-credit telemetry; `/api/campaigns`
  returns telemetry for owned campaigns. Homepage-purchased campaigns are owned
  by a deterministic advertiser id derived from purchase email, and the
  advertiser dashboard also resolves that email-derived id when the signed-in
  user's email matches. `/api/campaigns` now runs one best-effort read-time
  flush before reading durable budget and credited counts, so normal dashboard
  refreshes catch up recent credited impressions. Scheduled flushing is still
  required for unattended reconciliation.
- Multiple advertisers: bidding is real. `selectAd()` uses biddable campaigns
  and the core winner function: highest CPM wins, then creation/id tie-breakers.
- Withdrawals: the real-money path exists but is not proven production-ready.
  Connect onboarding creates/reuses a Stripe Express account; withdraw requires
  session auth, same-origin POST, `payouts_enabled`, minimum balance, and uses
  Stripe `transfers.create()` to transfer platform balance to the connected
  account. Durable balance still depends on flush, and this audit did not run a
  live/test Connect withdrawal. Provider transfer failures now return sanitized
  `502 payout_withdraw_failed` details rather than raw Stripe errors. Withdraw
  attempts now write developer activity rows for successful transfers, typed
  blocked attempts, and provider failures.

Read-time pending flush update:

- Root cause: `/api/track` credits land in hot pending counters first, while
  developer dashboard and payout status read durable ledger/user balance.
- Added `web/src/server/flush-before-read.ts`.
- `flushPendingForRead(container, context)` runs one bounded `runFlushCycle()`
  and logs failures instead of throwing into user-facing reads.
- `web/src/app/dashboard/developer/layout.tsx` now calls it before
  `container.ledger.listByDeveloper(developerId)`.
- `web/src/app/api/payouts/status/route.ts` now calls it before
  `users.getById(developerId)`.
- RED/GREEN verification:
  - RED helper test failed because `./flush-before-read` did not exist; GREEN
    helper test passed with 2 tests.
  - RED payout status route test failed because `flushPendingForRead` was not
    called; GREEN route test passed with 3 tests.
  - RED developer layout test failed because `flushPendingForRead` was not
    called; GREEN layout test passed with 1 test.
- Focused combined verification passed with 3 files / 6 tests.
- Web typecheck passed with `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- Web full test suite passed with 60 files passed, 1 skipped; 268 tests passed,
  1 skipped.
- Caveat: this improves read-your-writes behavior, but production still needs
  scheduled `/api/internal/flush` so money reconciles when no one opens the
  dashboard.
- CLI clickability: yes where OSC 8 hyperlinks are preserved. `/api/ad` returns
  `/api/click?campaignId=...`; `/api/click` increments click telemetry and
  redirects to the advertiser URL. Claude Code statusLine and legacy spinner
  wrapper emit OSC 8 links; the VS Code extension adapter sets
  `FORCE_HYPERLINK=1`.

Protected flush trigger endpoint:

- Added `POST /api/internal/flush`.
- The endpoint fails closed when no flush secret is configured, rejects missing
  or wrong bearer auth without draining pending work, and delegates authorized
  calls to `runFlushCycle()`.
- Production preflight now fails when neither `SPINSHARE_FLUSH_SECRET` nor
  `CRON_SECRET` is configured.
- `docs/production-test-guide.md` documents the Cloud Scheduler/manual POST
  check for Cloud Run.
- RED/GREEN verification passed for the route test and production env verifier
  focused tests.

Local Stripe test durability guard update:

- Confirmed the current `.env` was the unsafe hybrid causing paid local Stripe
  campaigns to disappear from ranking/dashboard: `SPINSHARE_MODE=local` and
  `STRIPE_MODE=test` while Firestore durable storage and namespace were unset.
- `buildContainer()` now fails fast for local `STRIPE_MODE=test|live` unless
  durable storage is Firestore via `FIRESTORE_EMULATOR_HOST` or
  `SPINSHARE_USE_FIRESTORE=1`.
- Existing local cloud Firestore isolation still requires
  `SPINSHARE_FIRESTORE_NAMESPACE`, so localhost writes use
  `namespaces/test/...`.
- The current `.env` now sets `SPINSHARE_USE_FIRESTORE=1` and
  `SPINSHARE_FIRESTORE_NAMESPACE="test"` without changing secret values.
- RED/GREEN verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/container.test.ts`.
- `verify:local-runtime` now passes Firestore isolation and Stripe durability
  checks; remaining blockers are external (`stripe` CLI missing, Java 8).

Payout concurrent-withdraw safety update:

- Found a real money-movement race: `withdrawBalance()` called Stripe before
  debiting durable balance, so two simultaneous withdraws could both transfer
  the same balance and drive the account negative.
- Added `UserRepository.tryDebitBalanceCents()` and implemented it in memory and
  Firestore repos.
- `withdrawBalance()` now reserves the balance before calling Stripe. A losing
  concurrent request returns `409 balance_changed` and does not call the payout
  gateway.
- If the payout gateway fails after reservation, the service restores the
  reserved amount.
- RED/GREEN verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/payout-service.test.ts`.
- Remaining payout work: user-facing payout activity exists, but a full provider
  reconciliation ledger with retry/settlement metadata is still needed before
  calling payout production complete.

Withdraw provider failure redaction:

- Root cause: `withdrawBalance()` restores reserved balance when provider
  transfer throws, but `POST /api/payouts/withdraw` did not catch and sanitize
  the provider exception.
- Added route-level sanitized mapping to `502 payout_withdraw_failed` with
  request id/status/code only.
- The route logs the sanitized body, not raw provider headers or secret
  material.
- RED/GREEN verification passed:
  - RED withdraw route test failed because the route threw the provider error.
  - GREEN withdraw route test passed with 3 tests after adding the catch.
- Payout focused verification passed with 4 files / 13 tests.
- Web typecheck passed with `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- Web full test suite passed after the withdraw route change with 61 files
  passed, 1 skipped; 271 tests passed, 1 skipped.
- Remaining payout work: full provider reconciliation ledger with retry state and
  settlement metadata.

Developer payout activity ledger update:

- Added `developer_event` payout activity rows with statuses `payoutPaid`,
  `payoutBlocked`, and `payoutFailed`.
- Memory and Firestore activity repositories preserve payout fields and return
  developer payout events from `listByDeveloper()`.
- `/api/activity/developer` now returns payout rows with amount, provider event
  id, provider status, and provider code metadata.
- `/api/activity/advertiser` explicitly excludes developer payout events so
  advertiser timelines stay campaign-scoped.
- Shared dashboard feed helpers format payout rows with payout-specific labels
  and provider trace details.
- `POST /api/payouts/withdraw` records best-effort payout activity for success,
  typed blocked attempts, and provider transfer failures.
- RED/GREEN verification:
  - RED focused test group failed because payout rows were formatted as fake
    impression rows, developer API dropped payout fields, and withdraw did not
    record activity.
  - GREEN focused group passed with 5 files / 22 tests.
  - Web typecheck passed.
  - Web full test suite passed with 61 files passed, 1 skipped; 274 tests
    passed, 1 skipped.
- Remaining payout work: full payout reconciliation ledger with retry state,
  provider settlement polling, and accounting exports.

Payout attempt reconciliation ledger update:

- Added `PayoutAttemptRepository` with `pending`, `paid`, `failed`, and
  `blocked` states for provider/accounting reconciliation.
- Added memory and Firestore repositories, plus namespace-aware
  `COLLECTIONS.payoutAttempts`.
- `Container` now exposes `payoutAttempts` in memory and Firestore modes.
- `withdrawBalance()` records blocked attempts for typed failures, pending before
  provider transfer, paid after provider success, and failed with provider
  request/status/code after provider exceptions.
- Focused RED/GREEN verification:
  - RED `payout-service.test.ts` failed with
    `MemoryPayoutAttemptRepository is not a constructor`.
  - GREEN `payout-service.test.ts` passed 6 tests.
  - Related withdraw route, collections, and container verification passed with
    3 files / 16 tests.
- Web typecheck passed with `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- Web full regression passed with 61 files passed, 1 skipped; 279 tests passed,
  1 skipped.
- Remaining payout work is now operational rather than basic attempt storage:
  Stripe settlement polling, retry workers, accounting exports, and a real
  test/live Connect withdrawal smoke test.

Advertiser campaign read-time flush update:

- Root cause: advertiser dashboard campaign cards read `/api/campaigns`, but
  credited impressions first land in the hot counter store/pending ledger queue
  and only update durable campaign budget + ledger counts after a flush.
- `GET /api/campaigns` now calls
  `flushPendingForRead(container, "advertiser-campaigns")` after successful auth
  and before listing campaigns, reading telemetry, or counting durable
  impressions.
- RED/GREEN verification:
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
    failed because a pending impression returned stale `budgetCents: 5000` and
    `telemetry.credited: 0`.
  - GREEN: the same focused test passed with 5 tests.
  - Related focused verification:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/server/flush-before-read.test.ts`
    passed 2 files / 7 tests.
  - `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
  - Full web regression passed with 61 files passed, 1 skipped; 275 tests
    passed, 1 skipped.
- Remaining caveat: this is one bounded best-effort flush per dashboard read.
  Production still needs scheduled `POST /api/internal/flush` for unattended
  reconciliation and large pending queues.

npm CLI Claude statusLine hyperlink parity:

- Root cause: the npm CLI Claude Code adapter rendered OSC8 hyperlinks but did
  not write `env.FORCE_HYPERLINK = "1"` into Claude settings. The VS Code
  extension adapter already did this, so npm-only installs had weaker clickable
  ad behavior.
- `cli-wrapper/src/claude-code-adapter.ts` now merges existing Claude
  `settings.env`, preserves unrelated keys, and forces
  `FORCE_HYPERLINK: "1"`.
- RED/GREEN verification:
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts`
    failed because merged settings preserved `FORCE_HYPERLINK: "0"`.
  - GREEN: the same focused test passed with 10 tests.
  - Related CLI verification:
    `corepack pnpm@9.12.0 --filter @spinshare/cli test -- src/claude-code-adapter.test.ts src/index.test.ts src/credential-store.test.ts`
    passed 3 files / 23 tests.
  - `corepack pnpm@9.12.0 --filter @spinshare/cli lint` passed.
- Remaining caveat: OSC8 clickability still needs real terminal smoke
  verification after packaging/installing the npm CLI.

Local runtime preflight precision update:

- `runPreflightChecks()` no longer treats Java 8 as a blocker when the current
  configuration uses namespace-isolated cloud Firestore instead of the Firestore
  emulator.
- The actual current preflight now reports Java as pass/warning:
  `Firestore emulator is not selected; Java runtime is not required`.
- The only remaining required local runtime failure is `command.stripe`: Stripe
  CLI is not on PATH, so real webhook forwarding cannot be verified yet.

Full regression after advertiser flush and CLI hyperlink fixes:

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
- Remaining caveat: this verifies the repository test/typecheck surface. Real
  Stripe webhook delivery, Stripe Connect payout settlement, and real Claude
  Code terminal hyperlink behavior still require external smoke tests in the
  intended runtime.

Advertiser dashboard checkout reconciliation update:

- Root cause: real Stripe local checkout can be paid while the webhook is not
  forwarded. The homepage checkout-status route could reconcile that session,
  but advertiser dashboard `/api/campaigns` could not, so the paid campaign
  stayed zero-budget and therefore absent from ranking/extension ads.
- Added `web/src/server/checkout-reconciliation.ts` with shared
  `reconcilePaidCheckoutSession()` and owned-campaign batch reconciliation.
- `/api/checkout-status` now uses the shared helper without behavior changes.
- `/api/campaigns` now reconciles paid pending checkout sessions for the
  authenticated advertiser's owned campaigns and refreshes the campaign list
  before returning.
- RED/GREEN verification:
  - RED:
    `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts`
    failed because the claimed public campaign returned `budgetCents: 0`.
  - GREEN: the same focused test passed with 6 tests.
  - Related focused verification passed with 4 files / 19 tests.
  - `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
  - Web full regression passed with 61 files passed, 1 skipped; 276 tests
    passed, 1 skipped.
- Remaining caveat: production still needs Stripe webhook delivery for fully
  unattended settlement when nobody opens checkout status or advertiser
  dashboard.

Full regression after advertiser dashboard checkout reconciliation:

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
- Remaining caveat: this is repository-level test/typecheck proof. It does not
  prove live Stripe webhook delivery, live Stripe Connect payout settlement, or
  real terminal hyperlink click behavior; those still require external smoke
  tests.

Status cleanup and latest full regression:

- `docs/project-status.md` no longer contains the stale claim that local RTDB hot
  counters are still unisolated; that bug is fixed in code and the remaining
  work is external Stripe/Firebase/Claude runtime smoke validation.
- The activity ledger status now reflects the current implementation:
  advertiser/developer load-more and export are implemented, advertiser
  filtering and developer search are implemented, and the remaining product
  work is detail drill-down plus clearer status explanations.
- The `.env` status was cleaned up: the old local real-Stripe plus memory
  durable storage pairing is now documented as the diagnosed historical root
  cause, while the current code has container/preflight guards for it.
- Payout status was updated: the backend now has durable provider attempt
  records for withdrawal reconciliation; remaining payout work is settlement
  polling, retries, accounting exports, and live/test Connect smoke validation.
- Ad safety status was updated: campaigns now have an optional durable
  `reviewStatus`, biddable/market surfaces include only approved campaigns, and
  repositories expose `updateReviewStatus()` for future async/manual review
  workers.
- Focused ad-review verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-adapters.test.ts src/server/bidding-service.test.ts src/app/api/market/route.test.ts`
  with 3 files / 26 tests.
- Web verification after ad-review status passed:
  - `corepack pnpm@9.12.0 --filter @spinshare/core build`
  - `corepack pnpm@9.12.0 --filter @spinshare/web lint`
  - `corepack pnpm@9.12.0 --filter @spinshare/web test` with 61 files passed,
    1 skipped; 282 tests passed, 1 skipped.
- Root verification after ad-review status passed:
  - `corepack pnpm@9.12.0 test`
    - core: 5 files / 39 tests; core build passed.
    - web: 61 files passed, 1 skipped; 282 tests passed, 1 skipped.
    - cli: 12 files / 97 tests.
    - vscode-extension: 8 files / 67 tests.
  - `corepack pnpm@9.12.0 lint`
- Latest full verification after payout attempt ledger passed:
  - `corepack pnpm@9.12.0 test`
    - core: 5 files / 39 tests; core build passed.
    - web: 61 files passed, 1 skipped; 279 tests passed, 1 skipped.
    - cli: 12 files / 97 tests.
    - vscode-extension: 8 files / 67 tests.
  - `corepack pnpm@9.12.0 lint`
    - core `tsc --noEmit`
    - core build
    - web `tsc --noEmit`
    - CLI `tsc --noEmit`
    - VS Code extension `tsc --noEmit`

External smoke audit and Connect fallback (2026-06-17):

- Tested the previously unverified external/runtime gaps: Stripe webhook to
  durable storage, Stripe Connect account creation, Claude Code runtime
  availability, CLI/statusLine click bytes, ad safety gates, production env
  readiness, low-CPM bidding behavior, and dashboard/activity ledger coverage.
- Made one narrow code fix in
  `web/src/server/adapters/stripe/stripe-payout-gateway.ts` after real Stripe
  Connect smoke exposed an invalid Accounts v2 payload and a v2-unavailable
  platform account.
- Stripe webhook to durable Firestore storage: test-mode external smoke passed
  with Stripe CLI forwarding `checkout.session.completed` to local Next and a
  unique Firestore namespace. Evidence:
  `marketBudgetCents=3000`, `firestoreBudgetCents=3000`, `publicRank=1`.
- Stripe Connect: not production/test ready yet. The code no longer sends the
  invalid Accounts v2 `requirements_collector` field and now falls back to
  controller-based Express `accounts.create()` when Accounts v2 is
  blocked/unavailable. External smoke then failed at Stripe platform setup:
  `You can only create new accounts if you've signed up for Connect`.
- Claude Code runtime: local preflight found
  `C:\Users\noahz\AppData\Roaming\npm\claude.CMD`; escalated checks returned
  `2.1.170 (Claude Code)` and help confirms interactive mode is default.
  Automated tests verify generated Claude hooks/statusLine scripts, session
  gating, OSC8 hyperlink bytes, and statusLine output. Real visual TUI placement
  and mouse click behavior still need manual terminal verification after install.
- CLI clickable ads: OSC8 rendering is implemented and tested, but actual click
  support depends on the terminal and cannot be proven from noninteractive shell
  output.
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
- Verification commands passed:
  - Connect gateway focused: 5 tests after RED/GREEN.
  - Web typecheck.
  - Payout focused: 5 files / 19 tests.
  - Webhook focused: 4 files / 11 tests.
  - CLI/statusLine focused: 2 files / 23 tests.
  - Local CLI smoke: `renderedLocalAd=true`.
  - Safety/bidding focused: core schema 24 tests and web safety/bidding 4 files
    / 22 tests.
  - Ledger/dashboard/activity focused: 7 files / 22 tests.
  - Repository-level regression:
    `corepack pnpm@9.12.0 test` passed with core 39 tests, web 303 passed / 1
    skipped, CLI 100 tests, and VS Code extension 67 tests.
  - Repository-level typecheck/lint:
    `corepack pnpm@9.12.0 lint` passed for core, web, CLI, and VS Code
    extension.
- Remaining blockers:
  - Enable Stripe Connect on the Stripe account, then rerun Connect onboarding
    and withdrawal smoke with a payouts-enabled test connected account.
  - Set production env correctly:
    `SPINSHARE_MODE=production`, a flush/cron secret, durable stores, and a
    scheduled caller for `/api/internal/flush`.
  - Manually verify Claude Code native TUI visual placement and terminal click
    behavior in the intended terminal/IDE.
  - Build the async/manual/LLM ad review worker if policy requires more than
    deterministic first-pass safety.

## Constraints
Keep this document aligned with the actual implementation status; do not mark
the full payment ledger timeline, Firestore persistence path, or real Claude
Code TUI behavior complete until they are implemented and verified.
