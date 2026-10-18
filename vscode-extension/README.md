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

## Updates

SpinShare is installed from a VSIX rather than the Marketplace, so the editor
does not auto-update it. Instead the extension updates itself: it periodically
checks your configured base URL for a newer published version and installs it in
place, then asks you to reload the window. You can trigger a check anytime with
`SpinShare: Check for Updates`, or turn the background check off with the
`spinshare.autoUpdate` setting.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `spinshare.baseUrl` | `https://spinshare-web-vert.vercel.app` | SpinShare web app base URL. Use `http://localhost:3000` for local dev. |
| `spinshare.terminalAutoWrap` | `true` | Prepends SpinShare shims to new integrated terminals. |
| `spinshare.terminalAgents` | `["claude"]` | Command names to auto-wrap in new integrated terminals. |
| `spinshare.autoUpdate` | `true` | Periodically check the base URL for a newer VSIX and install it in place. Reload is always prompted, never automatic. |

## Standalone CLI

The extension bundles the CLI wrapper for new integrated terminals. For external terminals, install or run the standalone `@spinshare/cli` wrapper separately.

## Privacy

Authentication uses a device code flow. Impressions are reported only when an ad is actually displayed for the required duration. See [spinshare-web-vert.vercel.app/privacy](https://spinshare-web-vert.vercel.app/privacy).

## Support

Questions or feedback: [support@learnx.pro](mailto:support@learnx.pro)
