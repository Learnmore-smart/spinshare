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
2. Create and fund at least one campaign so `/api/ad` returns `adAvailable: true`.
3. Point the CLI at the app and run a command that emits spinner-style output for at least 3 seconds:

```powershell
$env:SPINSHARE_API_URL = "http://localhost:3000"
$env:SPINSHARE_TOKEN = "<device-auth-token>"
corepack pnpm@9.12.0 --filter @spinshare/cli build
node .\cli-wrapper\dist\index.js node -e "let i=0; setInterval(() => process.stdout.write('\r' + ['|','/','-','\\'][i++%4]), 100); setTimeout(() => process.exit(0), 4500)"
```

The wrapped command must emit spinner-only frames for the CLI to replace them. You should see the ad text appear during the wait state. After 3 seconds, one impression should be reported to `/api/track`.

## Test Payment

Use Stripe test mode first:

```powershell
$env:STRIPE_MODE = "test"
```

Use a `sk_test_...` secret key for this pass. Create a campaign from the advertiser checkout UI, complete Stripe Checkout with test card `4242 4242 4242 4242`, then deliver the webhook to:

```text
/api/webhooks/stripe
```

Expected result: the campaign budget increases by the Checkout amount exactly once. Redelivering the same Stripe event should not increase it again.

## End-To-End System Check

1. `GET /api/health` returns `{ "status": "ok" }`.
2. `GET /api/ad` returns either a winning ad or `{ "adAvailable": false }`.
3. A valid `POST /api/track` with a bearer device token returns `recorded: true`.
4. The developer dashboard reflects credited earnings after flush/reconciliation.
5. The advertiser dashboard shows the funded campaign and reduced remaining budget after impressions.
