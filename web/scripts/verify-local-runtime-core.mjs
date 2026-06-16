import * as fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

function value(env, name) {
  return (env[name] ?? "").trim();
}

function result(name, ok, detail, severity = "required") {
  return { name, ok, detail, severity };
}

export function parseDotEnv(contents) {
  const parsed = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) continue;
    let raw = (match[2] ?? "").trim();
    const quote = raw[0];
    if ((quote === '"' || quote === "'") && raw.endsWith(quote)) {
      raw = raw.slice(1, -1);
    } else {
      raw = raw.replace(/\s+#.*$/, "").trim();
    }
    parsed[match[1]] = raw;
  }
  return parsed;
}

function pathEntries(env, pathDelimiter) {
  const pathValue =
    env.PATH ?? env.Path ?? env.path ?? "";
  return pathValue
    .split(pathDelimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function commandExtensions(command, env, platform) {
  if (path.extname(command)) {
    return [""];
  }
  if (platform !== "win32") {
    return [""];
  }
  const raw = env.PATHEXT || ".COM;.EXE;.BAT;.CMD";
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function commandCandidates(command, env, platform, pathDelimiter) {
  if (command.includes("/") || command.includes("\\")) {
    return [command];
  }
  const extensions = commandExtensions(command, env, platform);
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  return pathEntries(env, pathDelimiter).flatMap((entry) =>
    extensions.map((extension) => pathApi.join(entry, `${command}${extension}`)),
  );
}

export async function checkCommand(command, options = {}) {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const pathDelimiter = options.pathDelimiter ?? path.delimiter;
  const access = options.access ?? ((candidate) => fs.access(candidate));
  for (const candidate of commandCandidates(command, env, platform, pathDelimiter)) {
    try {
      await access(candidate);
      return result(`command.${command}`, true, `found ${candidate}`);
    } catch {
      // Try the next candidate.
    }
  }
  return result(
    `command.${command}`,
    false,
    `${command} not found on PATH; install it before running real external verification`,
  );
}

export function checkNodeVersion(nodeVersion = process.versions.node) {
  const major = Number.parseInt(nodeVersion.split(".")[0] ?? "", 10);
  if (Number.isFinite(major) && major >= 20) {
    return result("node.version", true, `Node ${nodeVersion}`);
  }
  return result("node.version", false, `Node 20+ required; found ${nodeVersion}`);
}

function parseJavaVersion(output) {
  const match = output.match(/version\s+"([^"]+)"/i);
  if (!match) return null;
  const version = match[1];
  const parts = version.split(/[._]/).map((part) => Number.parseInt(part, 10));
  const major = parts[0] === 1 ? parts[1] : parts[0];
  return Number.isFinite(major) ? { version, major } : null;
}

export function checkJavaVersionOutput(output) {
  const parsed = parseJavaVersion(output);
  if (!parsed) {
    return result("java.version", false, "could not parse java -version output");
  }
  if (parsed.major < 11) {
    return result(
      "java.version",
      false,
      `Java 11+ required for Firestore emulator; found ${parsed.version}`,
    );
  }
  if (parsed.major < 21) {
    return result(
      "java.version",
      true,
      `Java ${parsed.version} can run the current Firestore emulator; install Java 21+ before firebase-tools 15`,
      "warning",
    );
  }
  return result("java.version", true, `Java ${parsed.version}`);
}

function runCommand(command, args, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} timed out`));
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", () => {
      clearTimeout(timer);
      resolve(output);
    });
  });
}

export async function checkJavaRuntime(options = {}) {
  const runner = options.runner ?? runCommand;
  try {
    return checkJavaVersionOutput(await runner("java", ["-version"]));
  } catch {
    return result(
      "java.version",
      false,
      "java not found or could not run; install JDK 21+ before Firestore emulator verification",
    );
  }
}

export function checkLocalFirestoreIsolation(env) {
  const usesLocalFirestore =
    value(env, "SPINSHARE_MODE") === "local" &&
    value(env, "SPINSHARE_USE_FIRESTORE") === "1";
  if (!usesLocalFirestore) {
    return result(
      "env.local.firestoreIsolation",
      true,
      "local Firestore is not enabled",
      "warning",
    );
  }
  if (value(env, "FIRESTORE_EMULATOR_HOST")) {
    return result(
      "env.local.firestoreIsolation",
      true,
      `using Firestore emulator at ${value(env, "FIRESTORE_EMULATOR_HOST")}`,
    );
  }
  if (value(env, "SPINSHARE_FIRESTORE_NAMESPACE")) {
    return result(
      "env.local.firestoreIsolation",
      true,
      `using namespace ${value(env, "SPINSHARE_FIRESTORE_NAMESPACE")}`,
    );
  }
  return result(
    "env.local.firestoreIsolation",
    false,
    "local cloud Firestore requires SPINSHARE_FIRESTORE_NAMESPACE or FIRESTORE_EMULATOR_HOST",
  );
}

export async function runPreflightChecks(options = {}) {
  const env = options.env ?? process.env;
  const shared = {
    env,
    platform: options.platform ?? process.platform,
    pathDelimiter: options.pathDelimiter ?? path.delimiter,
    access: options.access,
  };
  return [
    checkNodeVersion(options.nodeVersion ?? process.versions.node),
    await checkCommand("claude", shared),
    await checkCommand("stripe", shared),
    await checkCommand("firebase", shared),
    await checkCommand("npx", shared),
    await checkJavaRuntime({ runner: options.runner }),
    checkLocalFirestoreIsolation(env),
  ];
}
