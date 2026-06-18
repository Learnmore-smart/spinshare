import { describe, expect, test } from "vitest";

import {
  checkCommand,
  checkJavaVersionOutput,
  checkLocalCredentialsShortcut,
  checkLocalFirestoreIsolation,
  checkLocalStripeDurability,
  checkNodeVersion,
  parseDotEnv,
  runPreflightChecks,
} from "./verify-local-runtime-core.mjs";

describe("parseDotEnv", () => {
  test("parses simple quoted and unquoted values", () => {
    expect(
      parseDotEnv(`
SPINSHARE_MODE=local
STRIPE_MODE="test"
EMPTY=
COMMENTED=value # trailing comment
`),
    ).toEqual({
      SPINSHARE_MODE: "local",
      STRIPE_MODE: "test",
      EMPTY: "",
      COMMENTED: "value",
    });
  });
});

describe("checkCommand", () => {
  test("finds a POSIX command on PATH", async () => {
    const checked = [];
    const result = await checkCommand("claude", {
      env: { PATH: "/bin:/usr/local/bin" },
      pathDelimiter: ":",
      platform: "linux",
      access: async (candidate) => {
        checked.push(candidate);
        if (candidate !== "/usr/local/bin/claude") {
          throw new Error("missing");
        }
      },
    });

    expect(result).toEqual({
      name: "command.claude",
      ok: true,
      detail: "found /usr/local/bin/claude",
      severity: "required",
    });
    expect(checked).toContain("/usr/local/bin/claude");
  });

  test("uses PATHEXT on Windows", async () => {
    const result = await checkCommand("stripe", {
      env: {
        PATH: "C:\\Tools",
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      },
      pathDelimiter: ";",
      platform: "win32",
      access: async (candidate) => {
        if (candidate !== "C:\\Tools\\stripe.CMD") {
          throw new Error("missing");
        }
      },
    });

    expect(result.ok).toBe(true);
    expect(result.detail).toBe("found C:\\Tools\\stripe.CMD");
  });

  test("reports missing command as a failed result", async () => {
    const result = await checkCommand("firebase", {
      env: { PATH: "/bin" },
      pathDelimiter: ":",
      platform: "linux",
      access: async () => {
        throw new Error("missing");
      },
    });

    expect(result.ok).toBe(false);
    expect(result.name).toBe("command.firebase");
    expect(result.detail).toContain("not found on PATH");
  });
});

describe("checkNodeVersion", () => {
  test("requires Node 20 or newer", () => {
    expect(checkNodeVersion("20.11.1")).toMatchObject({ ok: true });
    expect(checkNodeVersion("18.19.0")).toMatchObject({
      ok: false,
      detail: "Node 20+ required; found 18.19.0",
    });
  });
});

describe("checkJavaVersionOutput", () => {
  test("fails Java below 11 for the current Firestore emulator", () => {
    expect(
      checkJavaVersionOutput('java version "1.8.0_491"'),
    ).toMatchObject({
      ok: false,
      detail:
        "Java 11+ required for Firestore emulator; found 1.8.0_491",
    });
  });

  test("passes Java 21 and warns for 11 through 20", () => {
    expect(
      checkJavaVersionOutput('openjdk version "21.0.3" 2024-04-16'),
    ).toMatchObject({ ok: true, severity: "required" });

    expect(
      checkJavaVersionOutput('openjdk version "17.0.10" 2024-01-16'),
    ).toMatchObject({
      ok: true,
      severity: "warning",
      detail:
        "Java 17.0.10 can run the current Firestore emulator; install Java 21+ before firebase-tools 15",
    });
  });
});

describe("checkLocalFirestoreIsolation", () => {
  test("fails local cloud Firestore without namespace", () => {
    expect(
      checkLocalFirestoreIsolation({
        SPINSHARE_MODE: "local",
        SPINSHARE_USE_FIRESTORE: "1",
      }),
    ).toMatchObject({
      ok: false,
      name: "env.local.firestoreIsolation",
    });
  });

  test("passes with emulator host or namespace", () => {
    expect(
      checkLocalFirestoreIsolation({
        SPINSHARE_MODE: "local",
        SPINSHARE_USE_FIRESTORE: "1",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      }),
    ).toMatchObject({ ok: true });

    expect(
      checkLocalFirestoreIsolation({
        SPINSHARE_MODE: "local",
        SPINSHARE_USE_FIRESTORE: "1",
        SPINSHARE_FIRESTORE_NAMESPACE: "test",
      }),
    ).toMatchObject({ ok: true });
  });
});

describe("checkLocalCredentialsShortcut", () => {
  test("warns when local mock auth hides the browser credentials shortcut", () => {
    expect(
      checkLocalCredentialsShortcut({
        SPINSHARE_MODE: "local",
        AUTH_MODE: "mock",
      }),
    ).toMatchObject({
      ok: false,
      severity: "warning",
      name: "env.local.credentialsShortcut",
    });
  });

  test("passes when the local credentials shortcut is enabled or not needed", () => {
    expect(
      checkLocalCredentialsShortcut({
        SPINSHARE_MODE: "local",
        AUTH_MODE: "mock",
        NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS: "1",
      }),
    ).toMatchObject({ ok: true });

    expect(
      checkLocalCredentialsShortcut({
        SPINSHARE_MODE: "production",
        AUTH_MODE: "oauth",
      }),
    ).toMatchObject({ ok: true });
  });
});

describe("checkLocalStripeDurability", () => {
  test("passes local mock Stripe because no external payment is involved", () => {
    expect(
      checkLocalStripeDurability({
        SPINSHARE_MODE: "local",
        STRIPE_MODE: "mock",
      }),
    ).toMatchObject({
      ok: true,
      name: "env.local.stripeDurability",
    });
  });

  test("fails local real Stripe when durable repos are memory-backed", () => {
    expect(
      checkLocalStripeDurability({
        SPINSHARE_MODE: "local",
        STRIPE_MODE: "test",
      }),
    ).toMatchObject({
      ok: false,
      name: "env.local.stripeDurability",
    });
  });

  test("passes local real Stripe with emulator or namespace-isolated Firestore", () => {
    expect(
      checkLocalStripeDurability({
        SPINSHARE_MODE: "local",
        STRIPE_MODE: "test",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      }),
    ).toMatchObject({ ok: true });

    expect(
      checkLocalStripeDurability({
        SPINSHARE_MODE: "local",
        STRIPE_MODE: "test",
        SPINSHARE_USE_FIRESTORE: "1",
        SPINSHARE_FIRESTORE_NAMESPACE: "test",
      }),
    ).toMatchObject({ ok: true });
  });
});

describe("runPreflightChecks", () => {
  test("includes external runtime and env checks", async () => {
    const result = await runPreflightChecks({
      env: {
        PATH: "/bin",
        SPINSHARE_MODE: "local",
        SPINSHARE_USE_FIRESTORE: "1",
        SPINSHARE_FIRESTORE_NAMESPACE: "test",
      },
      nodeVersion: "22.1.0",
      pathDelimiter: ":",
      platform: "linux",
      access: async (candidate) => {
        if (candidate === "/bin/claude" || candidate === "/bin/npx") {
          return;
        }
        throw new Error("missing");
      },
      runner: async (command, args) => {
        if (command === "java" && args[0] === "-version") {
          return 'openjdk version "21.0.3" 2024-04-16';
        }
        return "";
      },
    });

    expect(result.map((item) => item.name)).toEqual([
      "node.version",
      "command.claude",
      "command.stripe",
      "command.firebase",
      "command.npx",
      "java.version",
      "env.local.firestoreIsolation",
      "env.local.credentialsShortcut",
      "env.local.stripeDurability",
    ]);
    expect(result.find((item) => item.name === "command.claude")).toMatchObject({
      ok: true,
    });
    expect(result.find((item) => item.name === "command.stripe")).toMatchObject({
      ok: false,
    });
    expect(result.find((item) => item.name === "command.npx")).toMatchObject({
      ok: true,
    });
    expect(result.find((item) => item.name === "java.version")).toMatchObject({
      ok: true,
    });
  });

  test("does not require Java when namespace Firestore is selected instead of emulator", async () => {
    const result = await runPreflightChecks({
      env: {
        PATH: "/bin",
        SPINSHARE_MODE: "local",
        STRIPE_MODE: "test",
        SPINSHARE_USE_FIRESTORE: "1",
        SPINSHARE_FIRESTORE_NAMESPACE: "test",
      },
      nodeVersion: "22.1.0",
      pathDelimiter: ":",
      platform: "linux",
      access: async (candidate) => {
        if (candidate === "/bin/claude" || candidate === "/bin/npx") {
          return;
        }
        throw new Error("missing");
      },
      runner: async (command, args) => {
        if (command === "java" && args[0] === "-version") {
          return 'java version "1.8.0_491"';
        }
        return "";
      },
    });

    expect(result.find((item) => item.name === "java.version")).toMatchObject({
      ok: true,
      severity: "warning",
      detail: "Firestore emulator is not selected; Java runtime is not required",
    });
  });
});
