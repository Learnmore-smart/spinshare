# Production Self-Test Guide

Run these from the repo root after `.env` is populated.

For a production-mode run, verify these are set before starting the app:

```powershell
$env:SPINSHARE_MODE = "production"
$env:SPINSHARE_COUNTER = "rtdb"
$env:AUTH_MODE = "oauth"
$env:STRIPE_MODE = "test" # switch to live only after test checkout passes
$env:NEXTAUTH_URL = "https://your-deployed-domain.example"
$env:AUTH_VERIFICATION_URI = "https://your-deployed-domain.example/activate"
```

`FIREBASE_DATABASE_URL` is required when `SPINSHARE_COUNTER=rtdb`.
The Firebase Realtime Database Management API (`firebasedatabase.googleapis.com`) must also be enabled for the project, and the deploy/service identity must be allowed to inspect RTDB instances.
`NEXTAUTH_URL` must be the public deployed app origin, not localhost.
If `AUTH_VERIFICATION_URI` is set, it must also use the deployed app origin; otherwise the CLI login activation link will point at localhost.
`STRIPE_MODE` must match the secret key prefix: use `test` with `sk_test_...`, or `live` with `sk_live_...`.

Run the read-only production env verifier:

```powershell
corepack pnpm@9.12.0 verify:prod-env
```

It checks env presence, production mode flags, Firestore read access, RTDB read access, Stripe key mode, Google OAuth credentials, GitHub OAuth credentials, and Firestore index config. It does not print secret values.

## Local External Runtime Preflight

Before running the localhost Stripe/Firebase/Claude checks, run:

```powershell
corepack pnpm@9.12.0 verify:local-runtime
```

This checks Node, `claude`, `stripe`, `firebase`, `npx`, Java for the Firestore emulator, and whether local Firestore writes are isolated by `FIRESTORE_EMULATOR_HOST` or `SPINSHARE_FIRESTORE_NAMESPACE`.

Current requirement notes:

- Stripe test webhooks require the Stripe CLI on `PATH`.
- Firestore emulator requires Java 11+ today, and Firebase tooling warns to use Java 21+ before `firebase-tools` 15.
- Local cloud Firestore testing must use either `FIRESTORE_EMULATOR_HOST` or `SPINSHARE_FIRESTORE_NAMESPACE=test` so localhost does not write to top-level Firestore collections.

## Automated Checks

```powershell
corepack pnpm@9.12.0 test
corepack pnpm@9.12.0 lint
corepack pnpm@9.12.0 build
$env:SPINSHARE_E2E_NEXT_CMD = "start"; corepack pnpm@9.12.0 test:e2e
```

## Firestore Indexes

Current Firestore queries only need automatic single-field indexes, so `firestore.indexes.json` is intentionally empty. Deploy the manifest anyway so production matches the repo:

```powershell
corepack pnpm@9.12.0 deploy:indexes
```

## Confirm CLI Ads Show

1. Start the web app against the environment you want to test.
2. Create and fund at least one campaign so authenticated `/api/ad` can return `adAvailable: true`.
3. Log in once. This is the device-flow approval step: the CLI prints a code, opens `/activate`, and polls until you approve it in the browser.
4. Point the CLI at the app and run a command that emits spinner-style output for at least 3 seconds:

```powershell
$env:SPINSHARE_API_URL = "http://localhost:3000"
corepack pnpm@9.12.0 --filter @spinshare/cli build
node .\cli-wrapper\dist\index.js login
node .\cli-wrapper\dist\index.js node -e "let i=0; setInterval(() => process.stdout.write('\r' + ['|','/','-','\\'][i++%4]), 100); setTimeout(() => process.exit(0), 4500)"
```

The wrapped command must emit spinner-only frames for the CLI to replace them. You should see the ad text appear during the wait state. After 3 seconds, one impression should be reported to `/api/track`.

## Confirm Extension Auto-Wrap

The VS Code extension only changes **new integrated terminals** opened after the extension activates or after `SpinShare: Rebuild Terminal Shims` runs. It does not rewrite external shells.

1. Install the VSIX.
2. Run `SpinShare: Sign In` and approve the device in the browser.
3. If testing locally, set `spinshare.baseUrl` to `http://localhost:3000`.
4. Run `SpinShare: Rebuild Terminal Shims`.
5. Open a new integrated terminal and run a configured agent command such as `claude`.

The packaged extension bundles the SpinShare CLI wrapper. For external terminals, use the standalone CLI command explicitly.

To remove the Claude Code adapter after testing:

```powershell
node .\cli-wrapper\dist\index.js setup claude-code --remove
```

From the extension, run `SpinShare: Remove Claude Code Adapter` from the command palette.

## Test Payment

Use Stripe test mode first:

```powershell
$env:STRIPE_MODE = "test"
```

Use a `sk_test_...` secret key for this pass. Create a campaign from the advertiser checkout UI, complete Stripe Checkout with test card `4242 4242 4242 4242`, then deliver the webhook to:

```text
/api/webhooks/stripe
```

For local testing, keep the app running and forward Stripe events with the Stripe CLI:

```powershell
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`, restart the app, then complete Checkout.

Expected result: the campaign budget increases by the Checkout amount exactly once. Redelivering the same Stripe event should not increase it again.

In `STRIPE_MODE=mock`, public homepage checkout settles immediately and redirects back to `/?checkout=success#bid-market`. In `STRIPE_MODE=test` or `live`, campaigns only become biddable after the Stripe webhook is received.

## Test Payout Onboarding

Stripe Connect must be enabled on the platform account before this flow works in `STRIPE_MODE=test` or `live`.

1. Sign in as a developer with at least `$5.00` available for payout.
2. Open the developer payout panel and choose the connect-with-Stripe action.
3. Expected API result: `/api/payouts/connect` returns an onboarding URL instead of a generic 500.
4. Expected Stripe result: a new Accounts v2 recipient account is created with Express dashboard access and Stripe-hosted requirements collection.

If Stripe rejects the request, check the server log for `requestId` and `providerStatus`, then look up that request in the Stripe Dashboard logs.

## End-To-End System Check

1. `GET /api/health` returns `{ "status": "ok" }`.
2. `GET /api/ad` with a bearer device token returns either a winning ad or `{ "adAvailable": false }`; missing/invalid tokens should return `401`.
3. A valid `POST /api/track` with a bearer device token returns `recorded: true`.
4. The developer dashboard reflects credited earnings after flush/reconciliation.
5. The advertiser dashboard shows the funded campaign and reduced remaining budget after impressions.
