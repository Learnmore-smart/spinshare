# SpinShare CLI (`@spinshare/cli`)

Separate product from the VS Code extension. The CLI authenticates the
developer, installs the Claude Code hooks/statusLine adapter, and keeps the
legacy command wrapper available as a fallback for tools without a native
lifecycle surface.

The VS Code extension lives in `vscode-extension/` and is installed as a `.vsix`
or from the Marketplace. This CLI is published as `@spinshare/cli`.

## Install

```bash
npm install -g @spinshare/cli
spinshare login
```

`spinshare login` runs the browser device flow, stores the token, and installs
the Claude Code adapter best-effort. After that, use Claude normally:

```bash
claude
```

To explicitly install or repair the Claude Code adapter:

```bash
spinshare setup claude-code
```

To remove SpinShare from `~/.claude/settings.json`:

```bash
spinshare setup claude-code --remove
```

Removal deletes only SpinShare statusLine/hooks and preserves unrelated Claude
settings/hooks.

## Local Testing

From the repo root after `corepack pnpm@9.12.0 build`:

```bash
corepack pnpm@9.12.0 cli:login

# Local dev: run `corepack pnpm@9.12.0 dev` in another terminal first.
corepack pnpm@9.12.0 cli:login:local
corepack pnpm@9.12.0 cli:test:local
```

Or set the API URL manually:

```powershell
$env:SPINSHARE_BASE_URL = "http://localhost:3000"
node .\cli-wrapper\dist\index.js login
```

`fake-ai.js` simulates a 5-second terminal spinner for legacy wrapper testing:

```bash
node cli-wrapper/dist/index.js node cli-wrapper/fake-ai.js
```

## What It Does

1. `spinshare login`: browser device flow; stores token in OS keychain or the
   file fallback; installs Claude Code hooks/statusLine.
2. `spinshare setup claude-code`: patches `~/.claude/settings.json` with a
   backup and generated hook/statusLine scripts.
3. `spinshare setup claude-code --remove`: removes SpinShare statusLine/hooks
   and generated adapter files.
4. `spinshare <command> [args]`: legacy fallback wrapper for tools without
   native hooks/statusLine.

## Build

```bash
corepack pnpm@9.12.0 --filter @spinshare/cli build
```

Output: `cli-wrapper/dist/index.js`
