# SpinShare for VS Code

Earn while your AI works. SpinShare shows unobtrusive, context-aware ads during AI generation wait states in VS Code, Cursor, and Trae.

## Features

- **Wait-state monetization** — Ads appear in a progress notification while your AI agent is thinking.
- **Browser sign-in** — One-time device flow; your token is stored securely in the editor.
- **Click-through support** — Open advertiser links directly from the notification.
- **Compatible editors** — Built on stable VS Code APIs; works in VS Code, Cursor, and Trae.

## Getting started

1. Install the extension (from VSIX locally, or from the Marketplace when published).
2. On first launch you will be prompted to **Sign in** — approve the device in your browser.
3. When an AI generation wait state begins, SpinShare may show a sponsored message in the bottom-right progress area.

### Commands

| Command | Description |
|---------|-------------|
| `SpinShare: Sign In` | Start the browser device authorization flow |
| `SpinShare: Sign Out` | Remove your stored token |
| `SpinShare: Start Generation (show ad)` | Manually trigger the ad flow (for testing) |
| `SpinShare: Complete Generation (dismiss ad)` | Dismiss the active ad notification |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `spinshare.baseUrl` | `https://www.spinshare.dev` | SpinShare web app base URL (use `http://localhost:3000` for local dev) |

## Privacy

Authentication uses a device code flow. Impressions are reported only when an ad is actually displayed. See [spinshare.dev/privacy](https://spinshare.dev/privacy).

## Related products

SpinShare also offers a **CLI wrapper** (`@spinshare/cli`) for terminal-based AI tools — a separate install, not bundled with this extension.

## Support

Questions or feedback: [support@spinshare.dev](mailto:support@spinshare.dev)
