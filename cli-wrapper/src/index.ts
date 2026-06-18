#!/usr/bin/env node
/**
 * @spinshare/cli — entry point.
 *
 * Routes the invocation to one of the CLI subcommands:
 *   - `spinshare login`            → browser device-flow authentication (task 13.7)
 *   - `spinshare <target> [args]`  → spawn the target command, intercept its
 *                                    spinner output, render ad text, and report
 *                                    impressions (tasks 13.2 / 13.4)
 *
 * `runWrap` is wired to the child-process wrapper (task 13.4); `login` runs the
 * browser device flow and stores the Device_Auth_Token (task 13.7).
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runWrap } from "./wrap.js";
import { runLogin } from "./login.js";
import { CliApiClient } from "./api-client.js";
import {
  createCredentialStore,
  FileCredentialStore,
  type CredentialStore,
} from "./credential-store.js";
import {
  defaultClaudeCodeAdapterStorageRoot,
  installClaudeCodeAdapter,
  removeClaudeCodeAdapter,
} from "./claude-code-adapter.js";

const USAGE = `spinshare — earn while your AI agent thinks.

Usage:
  spinshare login                 Authenticate via your browser (device flow)
  spinshare setup claude-code     Install Claude Code hooks/statusLine adapter
  spinshare setup claude-code --remove
                                  Remove SpinShare Claude Code adapter
  spinshare <command> [args...]   Run a command and monetize its wait states
  spinshare --help                Show this help

Examples:
  spinshare login
  spinshare setup claude-code
  spinshare claude
  spinshare npm run build
`;

type ParsedArgs =
  | { kind: "help" }
  | { kind: "login" }
  | { kind: "setupClaudeCode" }
  | { kind: "removeClaudeCode" }
  | { kind: "wrap"; target: string; args: string[] };

/** Pure argument parser so command routing can be unit/property tested. */
export function parseArgs(argv: string[]): ParsedArgs {
  const [first, ...rest] = argv;

  if (first === undefined || first === "--help" || first === "-h") {
    return { kind: "help" };
  }
  if (first === "login") {
    return { kind: "login" };
  }
  if (first === "setup" && rest.length === 1 && rest[0] === "claude-code") {
    return { kind: "setupClaudeCode" };
  }
  if (
    first === "setup" &&
    rest.length === 2 &&
    rest[0] === "claude-code" &&
    rest[1] === "--remove"
  ) {
    return { kind: "removeClaudeCode" };
  }
  return { kind: "wrap", target: first, args: rest };
}

async function runLoginCommand(): Promise<number> {
  const api = new CliApiClient();
  // Tag the stored token with this login's environment so local and production
  // credentials never overwrite or leak into each other (Bug B).
  const store = await createCredentialStore({ baseUrl: api.getBaseUrl() });
  return runLogin({
    api,
    store,
    afterTokenStored: async (token) => {
      await mirrorTokenForGeneratedHooks(token, api.getBaseUrl());
      await installClaudeCodeAdapter({
        baseUrl: api.getBaseUrl(),
        storageRoot: defaultClaudeCodeAdapterStorageRoot(),
      });
    },
  });
}

async function mirrorTokenForGeneratedHooks(
  token: string | null | undefined,
  baseUrl: string,
): Promise<void> {
  if (token === undefined || token === null || token === "") {
    return;
  }
  await new FileCredentialStore({ baseUrl }).save(token);
}

async function loadTokenForGeneratedHooks(
  baseUrl: string,
): Promise<string | null> {
  if (process.env.SPINSHARE_TOKEN && process.env.SPINSHARE_TOKEN.length > 0) {
    return process.env.SPINSHARE_TOKEN;
  }
  const store = await createCredentialStore({ baseUrl });
  return store.load();
}

async function runClaudeCodeSetupCommand(): Promise<number> {
  const api = new CliApiClient();
  const token = await loadTokenForGeneratedHooks(api.getBaseUrl()).catch(
    () => null,
  );
  await mirrorTokenForGeneratedHooks(token, api.getBaseUrl());
  const plan = await installClaudeCodeAdapter({
    baseUrl: api.getBaseUrl(),
    storageRoot: defaultClaudeCodeAdapterStorageRoot(),
  });
  if (plan === null) {
    process.stdout.write("SpinShare Claude Code adapter is disabled.\n");
    return 0;
  }
  process.stdout.write(
    `SpinShare Claude Code adapter installed at ${plan.settingsPath}.\n`,
  );
  if (!token) {
    process.stdout.write(
      "Run `spinshare login` so Claude Code ads can be attributed and paid.\n",
    );
  }
  return 0;
}

async function runClaudeCodeRemoveCommand(): Promise<number> {
  const api = new CliApiClient();
  const plan = await removeClaudeCodeAdapter({
    baseUrl: api.getBaseUrl(),
    storageRoot: defaultClaudeCodeAdapterStorageRoot(),
  });
  process.stdout.write(
    `SpinShare Claude Code adapter removed from ${plan.settingsPath}.\n`,
  );
  return 0;
}

/**
 * Build a {@link CliApiClient} whose token getter reads the stored
 * Device_Auth_Token (so it is reused on subsequent runs, Req 4.5), preferring an
 * explicit `SPINSHARE_TOKEN` env override when present. The token is loaded once
 * up front; a getter returns the cached value to the client per request.
 */
async function buildAuthedClient(): Promise<CliApiClient> {
  const baseUrl = new CliApiClient().getBaseUrl();
  let token: string | null | undefined = process.env.SPINSHARE_TOKEN;
  if (token === undefined || token === "") {
    // Only reuse a stored token that was issued for this exact environment, so
    // `cli:test:local` never sends a production token to localhost (Bug B).
    const store: CredentialStore = await createCredentialStore({ baseUrl });
    token = await store.load();
  }
  return new CliApiClient({ baseUrl, tokenProvider: () => token });
}

export async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  switch (parsed.kind) {
    case "help":
      process.stdout.write(USAGE);
      return 0;
    case "login":
      return runLoginCommand();
    case "setupClaudeCode":
      return runClaudeCodeSetupCommand();
    case "removeClaudeCode":
      return runClaudeCodeRemoveCommand();
    case "wrap": {
      const client = await buildAuthedClient();
      return runWrap({ target: parsed.target, args: parsed.args, client });
    }
  }
}

type MainRunner = (argv: string[]) => Promise<number>;
type ExitProcess = (code: number) => void;
type ErrorWriter = (message: string) => void;

export async function runDirectExecution(
  argv: string[],
  run: MainRunner = main,
  exitProcess: ExitProcess = process.exit,
  writeError: ErrorWriter = (message) => {
    process.stderr.write(message);
  },
): Promise<void> {
  try {
    const code = await run(argv);
    exitProcess(code);
  } catch (err) {
    writeError(
      `spinshare: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    exitProcess(1);
  }
}

/** True when this module is the process entrypoint rather than a test import. */
export function isDirectExecution(
  moduleUrl: string = import.meta.url,
  argv1: string | undefined = process.argv[1],
): boolean {
  if (argv1 === undefined) {
    return false;
  }
  return fileURLToPath(moduleUrl) === resolve(argv1);
}

// Only execute when run as a binary, not when imported by tests.
if (isDirectExecution()) {
  void runDirectExecution(process.argv.slice(2));
}
