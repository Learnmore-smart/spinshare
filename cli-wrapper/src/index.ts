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
import { createCredentialStore, type CredentialStore } from "./credential-store.js";

const USAGE = `spinshare — earn while your AI agent thinks.

Usage:
  spinshare login                 Authenticate via your browser (device flow)
  spinshare <command> [args...]   Run a command and monetize its wait states
  spinshare --help                Show this help

Examples:
  spinshare login
  spinshare claude
  spinshare npm run build
`;

type ParsedArgs =
  | { kind: "help" }
  | { kind: "login" }
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
  return { kind: "wrap", target: first, args: rest };
}

async function runLoginCommand(): Promise<number> {
  const store = await createCredentialStore();
  const api = new CliApiClient();
  return runLogin({ api, store });
}

/**
 * Build a {@link CliApiClient} whose token getter reads the stored
 * Device_Auth_Token (so it is reused on subsequent runs, Req 4.5), preferring an
 * explicit `SPINSHARE_TOKEN` env override when present. The token is loaded once
 * up front; a getter returns the cached value to the client per request.
 */
async function buildAuthedClient(): Promise<CliApiClient> {
  let token: string | null | undefined = process.env.SPINSHARE_TOKEN;
  if (token === undefined || token === "") {
    const store: CredentialStore = await createCredentialStore();
    token = await store.load();
  }
  return new CliApiClient({ tokenProvider: () => token });
}

export async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  switch (parsed.kind) {
    case "help":
      process.stdout.write(USAGE);
      return 0;
    case "login":
      return runLoginCommand();
    case "wrap": {
      const client = await buildAuthedClient();
      return runWrap({ target: parsed.target, args: parsed.args, client });
    }
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
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      process.stderr.write(`spinshare: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    });
}
