import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));
const webRoot = path.resolve(scriptsDir, "..");
const nextDir = path.resolve(webRoot, ".next");

if (nextDir !== path.join(webRoot, ".next")) {
  throw new Error(`Refusing to clean unexpected path: ${nextDir}`);
}

await rm(nextDir, { recursive: true, force: true });
