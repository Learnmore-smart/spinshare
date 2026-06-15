# SpinShare for VS Code

Earn while your AI works. SpinShare wraps supported terminal AI agents and shows sponsored messages during eligible wait states in VS Code, Cursor, and Trae.

## Features

- **Terminal auto-wrap** - New integrated terminals route configured agent commands through the bundled SpinShare CLI wrapper.
- **Browser sign-in** - One-time device flow; your token is stored securely in the editor.
- **Progress notification ads** - Host integrations can trigger the notification-based ad flow directly.
- **Click-through support** - Open advertiser links directly from the notification.
- **Compatible editors** - Built on stable VS Code APIs; works in VS Code, Cursor, and Trae.

## Getting started

1. Install the extension from VSIX locally, or from the Marketplace when published.
2. Sign in when prompted, or run `SpinShare: Sign In` from the command palette. Approve the device in your browser.
3. Open a **new integrated terminal** after sign-in. Existing terminals keep their old `PATH`.
4. Run `claude` or another configured agent normally. SpinShare's shim wraps it through the bundled CLI.
5. When the agent emits a spinner-style wait state for at least 3 seconds and a funded ad is available, the spinner is replaced with ad text and an impression is credited.

## Commands

| Command | Description |
|---------|-------------|
| `SpinShare: Sign In` | Start the browser device authorization flow |
| `SpinShare: Sign Out` | Remove your stored token |
| `SpinShare: Start Generation (show ad)` | Manually trigger the notification ad flow for testing |
| `SpinShare: Complete Generation (dismiss ad)` | Dismiss the active notification ad |
| `SpinShare: Rebuild Terminal Shims` | Recreate terminal shims after changing base URL or agent command settings |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `spinshare.baseUrl` | `https://www.spinshare.dev` | SpinShare web app base URL. Use `http://localhost:3000` for local dev. |
| `spinshare.terminalAutoWrap` | `true` | Prepends SpinShare shims to new integrated terminals. |
| `spinshare.terminalAgents` | `["claude"]` | Command names to auto-wrap in new integrated terminals. |

## Standalone CLI

The extension bundles the CLI wrapper for new integrated terminals. For external terminals, install or run the standalone `@spinshare/cli` wrapper separately.

## Privacy

Authentication uses a device code flow. Impressions are reported only when an ad is actually displayed for the required duration. See [spinshare.dev/privacy](https://spinshare.dev/privacy).

## Support

Questions or feedback: [support@spinshare.dev](mailto:support@spinshare.dev)
