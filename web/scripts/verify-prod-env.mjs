#!/usr/bin/env node

import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";

import { checkStrictModes } from "./verify-prod-env-core.mjs";

export { checkStrictModes } from "./verify-prod-env-core.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DEFAULT_ENV_FILE = path.join(REPO_ROOT, ".env");
const FIRESTORE_INDEXES_FILE = path.join(REPO_ROOT, "firestore.indexes.json");
const FIREBASE_CONFIG_FILE = path.join(REPO_ROOT, "firebase.json");

function parseArgs(argv) {
  const args = {
    envFile: DEFAULT_ENV_FILE,
    strictProduction: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--strict-production") {
      args.strictProduction = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--env-file") {
      const next = argv[i + 1];
      if (!next) throw new Error("--env-file requires a path");
      args.envFile = path.resolve(next);
      i += 1;
    } else if (arg.startsWith("--env-file=")) {
      args.envFile = path.resolve(arg.slice("--env-file=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function parseDotEnvValue(raw) {
  let value = raw.trim();
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "").trim();
}

function parseDotEnv(contents) {
  const parsed = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) continue;
    parsed[match[1]] = parseDotEnvValue(match[2] ?? "");
  }
  return parsed;
}

async function loadEnv(envFile) {
  const fileEnv = parseDotEnv(await readFile(envFile, "utf8"));
  return { ...fileEnv, ...process.env };
}

function value(env, name) {
  return (env[name] ?? "").trim();
}

function maskedPresent(env, name) {
  return value(env, name).length > 0;
}

function result(name, ok, detail, warnings) {
  return { name, ok, detail, warnings: warnings ?? [] };
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64urlJson({ alg: "RS256", typ: "JWT" })}.${base64urlJson({
    iss: value(env, "FIREBASE_CLIENT_EMAIL"),
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(
    value(env, "FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    "base64url",
  );
  const response = await withTimeout(
    fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${unsigned}.${signature}`,
      }),
    }),
    15_000,
    "Google service-account token exchange",
  );
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? `token exchange failed with status ${response.status}`);
  }
  return body.access_token;
}

async function checkJsonFile(file, validate) {
  const parsed = JSON.parse(await readFile(file, "utf8"));
  validate(parsed);
}

async function checkFirebaseIndexes() {
  await checkJsonFile(FIREBASE_CONFIG_FILE, (config) => {
    if (config?.firestore?.indexes !== "firestore.indexes.json") {
      throw new Error("firebase.json must point firestore.indexes at firestore.indexes.json");
    }
  });
  await checkJsonFile(FIRESTORE_INDEXES_FILE, (indexes) => {
    if (!Array.isArray(indexes?.indexes) || !Array.isArray(indexes?.fieldOverrides)) {
      throw new Error("firestore.indexes.json must contain indexes and fieldOverrides arrays");
    }
  });
}

function requiredEnvNames(strictProduction) {
  const names = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GITHUB_ID",
    "GITHUB_SECRET",
    "AUTH_SECRET",
    "NEXTAUTH_URL",
  ];
  if (strictProduction) {
    names.push("FIREBASE_DATABASE_URL");
  }
  return names;
}

function checkRequiredEnv(env, strictProduction) {
  const missing = requiredEnvNames(strictProduction).filter(
    (name) => !maskedPresent(env, name),
  );
  if (missing.length > 0) {
    return result("env.required.present", false, `missing: ${missing.join(", ")}`);
  }
  return result("env.required.present", true, "required values are present");
}

function firebaseAppConfig(env) {
  const databaseURL = value(env, "FIREBASE_DATABASE_URL");
  return {
    projectId: value(env, "FIREBASE_PROJECT_ID"),
    credential: cert({
      projectId: value(env, "FIREBASE_PROJECT_ID"),
      clientEmail: value(env, "FIREBASE_CLIENT_EMAIL"),
      privateKey: value(env, "FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    ...(databaseURL ? { databaseURL } : {}),
  };
}

async function checkFirebase(env) {
  let app;
  const checks = [];
  try {
    app = initializeApp(firebaseAppConfig(env), `spinshare-prod-verify-${Date.now()}`);
    const collections = await withTimeout(
      getFirestore(app).listCollections(),
      15_000,
      "Firestore listCollections",
    );
    checks.push(
      result("firebase.firestore.read", true, `listed ${collections.length} root collections`),
    );
  } catch (error) {
    checks.push(
      result("firebase.firestore.read", false, error instanceof Error ? error.message : String(error)),
    );
  }

  if (value(env, "FIREBASE_DATABASE_URL")) {
    try {
      if (!app) throw new Error("Firebase app did not initialize");
      const snap = await withTimeout(
        getDatabase(app).ref("spinshare/health/probe").get(),
        15_000,
        "RTDB probe read",
      );
      checks.push(
        result(
          "firebase.rtdb.read",
          true,
          snap.exists() ? "probe path exists" : "probe path readable and absent",
        ),
      );
    } catch (error) {
      checks.push(
        result("firebase.rtdb.read", false, error instanceof Error ? error.message : String(error)),
      );
    }
  } else {
    checks.push(
      result("firebase.rtdb.read", false, "FIREBASE_DATABASE_URL is not set"),
    );
  }

  if (app) await deleteApp(app);
  return checks;
}

async function checkRealtimeDatabaseManagementApi(env) {
  try {
    const accessToken = await getGoogleAccessToken(env);
    const response = await withTimeout(
      fetch(
        `https://firebasedatabase.googleapis.com/v1beta/projects/${value(
          env,
          "FIREBASE_PROJECT_ID",
        )}/locations/-/instances?pageSize=100`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      ),
      15_000,
      "RTDB instances list",
    );
    const body = await response.json();
    if (!response.ok) {
      const message =
        typeof body?.error?.message === "string"
          ? body.error.message
          : `status ${response.status}`;
      return result("firebase.rtdb.management", false, message);
    }
    const count = Array.isArray(body.instances) ? body.instances.length : 0;
    return result("firebase.rtdb.management", true, `listed ${count} RTDB instances`);
  } catch (error) {
    return result(
      "firebase.rtdb.management",
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function checkStripe(env) {
  try {
    const balance = await withTimeout(
      new Stripe(value(env, "STRIPE_SECRET_KEY")).balance.retrieve(),
      15_000,
      "Stripe balance.retrieve",
    );
    const expectedLiveMode = value(env, "STRIPE_MODE") === "live";
    if (["test", "live"].includes(value(env, "STRIPE_MODE")) && balance.livemode !== expectedLiveMode) {
      return result(
        "stripe.balance.retrieve",
        false,
        `key livemode=${balance.livemode} does not match STRIPE_MODE=${value(env, "STRIPE_MODE")}`,
      );
    }
    return result("stripe.balance.retrieve", true, `livemode=${balance.livemode}`);
  } catch (error) {
    return result("stripe.balance.retrieve", false, error instanceof Error ? error.message : String(error));
  }
}

async function checkGitHubOAuth(env) {
  try {
    const response = await withTimeout(
      fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { accept: "application/json" },
        body: new URLSearchParams({
          client_id: value(env, "GITHUB_ID"),
          client_secret: value(env, "GITHUB_SECRET"),
          code: "spinshare-invalid-code",
        }),
      }),
      15_000,
      "GitHub OAuth probe",
    );
    const data = await response.json();
    return result(
      "github.oauth.credentials",
      data.error === "bad_verification_code",
      data.error ?? `status ${response.status}`,
    );
  } catch (error) {
    return result("github.oauth.credentials", false, error instanceof Error ? error.message : String(error));
  }
}

async function checkGoogleOAuth(env) {
  try {
    const redirectUri = `${value(env, "NEXTAUTH_URL").replace(/\/+$/, "")}/api/auth/callback/google`;
    const response = await withTimeout(
      fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { accept: "application/json" },
        body: new URLSearchParams({
          client_id: value(env, "GOOGLE_CLIENT_ID"),
          client_secret: value(env, "GOOGLE_CLIENT_SECRET"),
          code: "spinshare-invalid-code",
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      }),
      15_000,
      "Google OAuth probe",
    );
    const data = await response.json();
    return result(
      "google.oauth.credentials",
      data.error === "invalid_grant",
      data.error ?? `status ${response.status}`,
    );
  } catch (error) {
    return result("google.oauth.credentials", false, error instanceof Error ? error.message : String(error));
  }
}

function printText(results) {
  const yellow = "\x1b[33m";
  const reset = "\x1b[0m";
  for (const item of results) {
    const marker = item.ok ? "PASS" : "FAIL";
    console.log(`${marker} ${item.name}: ${item.detail}`);
    if (item.ok && item.warnings?.length > 0) {
      for (const w of item.warnings) {
        console.log(`${yellow}  WARNING: ${w}${reset}`);
      }
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = await loadEnv(args.envFile);
  const results = [];

  results.push(checkRequiredEnv(env, args.strictProduction));
  if (args.strictProduction) {
    results.push(checkStrictModes(env));
  }

  try {
    await checkFirebaseIndexes();
    results.push(result("firebase.index.config", true, "firebase.json and firestore.indexes.json parse"));
  } catch (error) {
    results.push(result("firebase.index.config", false, error instanceof Error ? error.message : String(error)));
  }

  results.push(...(await checkFirebase(env)));
  results.push(await checkRealtimeDatabaseManagementApi(env));
  results.push(await checkStripe(env));
  results.push(await checkGitHubOAuth(env));
  results.push(await checkGoogleOAuth(env));

  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    printText(results);
  }

  if (results.some((item) => !item.ok)) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
