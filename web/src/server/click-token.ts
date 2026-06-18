import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEV_FALLBACK_SECRET = "spinshare-dev-insecure-secret-do-not-use-in-prod";

export interface ClickTokenPayload {
  campaignId: string;
  developerId: string;
  iat: number;
  exp: number;
}

export interface MintClickTokenInput {
  campaignId: string;
  developerId: string;
  nowMs?: number;
  ttlMs?: number;
  secret?: string;
}

function resolveSecret(explicit?: string): string {
  const secret = explicit ?? process.env.AUTH_SECRET;
  return secret && secret.length > 0 ? secret : DEV_FALLBACK_SECRET;
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function sign(signingInput: string, secret: string): string {
  return createHmac("sha256", secret).update(signingInput).digest("base64url");
}

export function mintClickToken(input: MintClickTokenInput): string {
  const nowMs = input.nowMs ?? Date.now();
  const ttlMs = input.ttlMs ?? DEFAULT_TTL_MS;
  const payload: ClickTokenPayload = {
    campaignId: input.campaignId,
    developerId: input.developerId,
    iat: nowMs,
    exp: nowMs + ttlMs,
  };
  const encodedPayload = encodeJson(payload);
  const signingInput = `${TOKEN_VERSION}.${encodedPayload}`;
  return `${signingInput}.${sign(signingInput, resolveSecret(input.secret))}`;
}

export function verifyClickToken(
  token: string | null | undefined,
  opts: { campaignId: string; nowMs?: number; secret?: string },
): ClickTokenPayload | null {
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [version, encodedPayload, signature] = parts;
  if (
    version !== TOKEN_VERSION ||
    encodedPayload === undefined ||
    signature === undefined
  ) {
    return null;
  }

  const signingInput = `${version}.${encodedPayload}`;
  const expected = sign(signingInput, resolveSecret(opts.secret));
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = decodeJson<ClickTokenPayload>(encodedPayload);
  if (
    payload === null ||
    payload.campaignId !== opts.campaignId ||
    typeof payload.developerId !== "string" ||
    payload.developerId.length === 0 ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  const nowMs = opts.nowMs ?? Date.now();
  return nowMs < payload.exp ? payload : null;
}
