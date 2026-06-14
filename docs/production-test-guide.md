# Production Self-Test Guide

Run these from the repo root after `.env` is populated.

## Automated Checks

```powershell
corepack pnpm@9.12.0 test
corepack pnpm@9.12.0 lint
corepack pnpm@9.12.0 build
corepack pnpm@9.12.0 test:e2e
```

## Firestore Indexes

Current Firestore queries only need automatic single-field indexes, so `firestore.indexes.json` is intentionally empty. Deploy the manifest anyway so production matches the repo:

```powershell
npx --yes firebase-tools deploy --only firestore:indexes --project $env:FIREBASE_PROJECT_ID
```

## Confirm CLI Ads Show

1. Start the web app against the environment you want to test.
2. Create and fund at least one campaign so `/api/ad` returns `adAvailable: true`.
3. Point the CLI at the app and run a command that emits spinner-style output for at least 3 seconds:

```powershell
$env:SPINSHARE_API_URL = "http://localhost:3000"
$env:SPINSHARE_TOKEN = "<device-auth-token>"
corepack pnpm@9.12.0 --filter @spinshare/cli build
node .\cli-wrapper\dist\index.js node -e "let i=0; setInterval(() => process.stdout.write('\r' + ['|','/','-','\\'][i++%4] + ' working'), 100); setTimeout(() => process.exit(0), 4500)"
```

You should see the wrapped command continue normally and the ad text appear during the wait state. After 3 seconds, one impression should be reported to `/api/track`.

## Test Payment

Use Stripe test mode first:

```powershell
$env:STRIPE_MODE = "test"
```

Create a campaign from the advertiser checkout UI, complete Stripe Checkout with test card `4242 4242 4242 4242`, then deliver the webhook to:

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
