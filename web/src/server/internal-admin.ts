const DEFAULT_INTERNAL_ADMIN_EMAILS = ["noahzh52@gmail.com"];

function parseInternalAdminEmails(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim().length === 0) {
    return DEFAULT_INTERNAL_ADMIN_EMAILS;
  }

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function getInternalAdminEmails(
  env: NodeJS.ProcessEnv = process.env,
): readonly string[] {
  return parseInternalAdminEmails(env.SPINSHARE_INTERNAL_ADMIN_EMAILS);
}

export function isInternalAdminEmail(
  email: string | undefined | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return getInternalAdminEmails(env).includes(normalized);
}
