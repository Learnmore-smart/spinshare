import { access, cp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(extensionRoot, "..");
const source = join(repoRoot, "cli-wrapper", "dist");
const target = join(extensionRoot, "cli-wrapper", "dist");
const nodeModulesTarget = join(extensionRoot, "cli-wrapper", "node_modules");
const ptyPackageSegments = ["@homebridge", "node-pty-prebuilt-multiarch"];
const ptySource = join(
  repoRoot,
  "cli-wrapper",
  "node_modules",
  ...ptyPackageSegments,
);
const ptyTarget = join(nodeModulesTarget, ...ptyPackageSegments);
const packageTarget = join(extensionRoot, "cli-wrapper", "package.json");
const cliPackageJson = `{
  "private": true,
  "type": "module"
}
`;

try {
  await access(join(source, "index.js"));
} catch {
  console.error(
    "SpinShare CLI bundle is missing. Run `corepack pnpm@9.12.0 --filter @spinshare/cli build` first.",
  );
  process.exit(1);
}

try {
  await access(join(ptySource, "package.json"));
} catch {
  console.error(
    "SpinShare CLI PTY runtime is missing. Run `corepack pnpm@9.12.0 install` first.",
  );
  process.exit(1);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
await rm(nodeModulesTarget, { recursive: true, force: true });
await mkdir(dirname(ptyTarget), { recursive: true });
await cp(await realpath(ptySource), ptyTarget, {
  recursive: true,
  dereference: true,
});
await writeFile(packageTarget, cliPackageJson);

console.log(`Bundled CLI wrapper into ${target}`);
console.log(`Bundled PTY runtime into ${ptyTarget}`);
