import { createHash } from "node:crypto";

export function normalizeAdvertiserEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function publicAdvertiserIdForEmail(email: string): string {
  const normalized = normalizeAdvertiserEmail(email);
  const digest = createHash("sha256").update(normalized).digest("hex").slice(0, 32);
  return `public_${digest}`;
}
