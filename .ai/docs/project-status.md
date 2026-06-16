# docs/project-status.md mirror

## Purpose
`docs/project-status.md` is the single project status and architecture decision document for SpinShare. It records what the product is, what is currently broken, and what should be fixed first.

## Current update

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
- `docs/project-status.md` now distinguishes completed API pagination from
  remaining ledger product work: UI load-more controls, filters, export, and
  detail views.
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

## Constraints
Keep this document aligned with the actual implementation status; do not mark
the full payment ledger timeline, Firestore persistence path, or real Claude
Code TUI behavior complete until they are implemented and verified.
