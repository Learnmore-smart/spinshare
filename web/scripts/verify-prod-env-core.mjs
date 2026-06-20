function value(env, name) {
  return (env[name] ?? "").trim();
}

function result(name, ok, detail, warnings) {
  return { name, ok, detail, warnings: warnings ?? [] };
}

function isLocalHttpUrl(raw) {
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return ["localhost", "127.0.0.1", "::1"].includes(
      parsed.hostname.toLowerCase(),
    );
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(raw);
  }
}

export function checkStrictModes(env) {
  const failures = [];
  const warnings = [];
  if (value(env, "SPINSHARE_MODE") !== "production") {
    failures.push("SPINSHARE_MODE must be production");
  }
  if (value(env, "SPINSHARE_COUNTER") !== "rtdb") {
    failures.push("SPINSHARE_COUNTER must be rtdb");
  }
  if (value(env, "AUTH_MODE") !== "oauth") {
    failures.push("AUTH_MODE must be oauth");
  }
  if (!["test", "live"].includes(value(env, "STRIPE_MODE"))) {
    failures.push("STRIPE_MODE must be test or live");
  }
  if (!value(env, "SPINSHARE_FLUSH_SECRET") && !value(env, "CRON_SECRET")) {
    failures.push("SPINSHARE_FLUSH_SECRET or CRON_SECRET must be set");
  }
  if (isLocalHttpUrl(value(env, "NEXTAUTH_URL"))) {
    warnings.push(
      "NEXTAUTH_URL is localhost - set https://www.spinshare.dev in Cloud Run variables for production",
    );
  }
  if (
    value(env, "AUTH_VERIFICATION_URI") &&
    isLocalHttpUrl(value(env, "AUTH_VERIFICATION_URI"))
  ) {
    warnings.push(
      "AUTH_VERIFICATION_URI is localhost - set https://www.spinshare.dev/activate in Cloud Run variables for production",
    );
  }
  if (!value(env, "NEXT_PUBLIC_GA_MEASUREMENT_ID")) {
    warnings.push(
      "NEXT_PUBLIC_GA_MEASUREMENT_ID is unset - GA4 will be omitted from production Docker builds unless passed as a build arg",
    );
  }
  return result(
    "env.production.flags",
    failures.length === 0,
    failures.length === 0
      ? warnings.length > 0
        ? `production flags are set; ${warnings.join("; ")}`
        : "production flags are set"
      : failures.join("; "),
    warnings,
  );
}
