# SpinShare CLI (`@spinshare/cli`)

**Separate product from the VS Code extension.** The CLI wraps terminal commands (e.g. `claude`, `npm run build`) and shows ads while their spinner output indicates a wait state.

The VS Code extension lives in `vscode-extension/` and is installed as a `.vsix` or from the Marketplace. This CLI is built and run from `cli-wrapper/`.

## Local testing (no npm publish)

From the **repo root** (after `pnpm build`):

```bash
# Production API (requires deployed SpinShare — not the Cloud Run placeholder)
pnpm cli:login

# Local dev (run `pnpm dev` in another terminal first)
pnpm cli:login:local
pnpm cli:test:local
```

Or set the API URL manually:

```bash
# PowerShell
$env:SPINSHARE_BASE_URL="http://localhost:3000"; pnpm cli:login
```

Or from `cli-wrapper/`:

```bash
node dist/index.js login
node dist/index.js node fake-ai.js
```

`fake-ai.js` simulates a 5-second terminal spinner for manual testing.

## What it does

1. `spinshare login` — browser device flow; stores token in OS keychain (or env `SPINSHARE_TOKEN`).
2. `spinshare <command> [args]` — runs the command, intercepts spinner-only stdout frames, renders ad text after 3s of continuous spinner output, reports impressions.

## Build

```bash
pnpm --filter @spinshare/cli build
```

Output: `cli-wrapper/dist/index.js`
