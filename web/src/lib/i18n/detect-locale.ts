import { DEFAULT_LOCALE, LOCALES, type Locale } from "./types";

/**
 * Parse a BCP-47 Accept-Language header and pick the best supported locale.
 * Falls back to `DEFAULT_LOCALE` when nothing matches.
 *
 * Example: `"zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7"` → `"zh"`.
 */
export function detectLocaleFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  const candidates = header
    .split(",")
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(";");
      const tag = rawTag?.trim().toLowerCase() ?? "";
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.split("=")[1]) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((c) => c.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    const base = tag.split("-")[0];
    if ((LOCALES as readonly string[]).includes(base)) {
      return base as Locale;
    }
  }
  return DEFAULT_LOCALE;
}

/** SSR-safe: extract the Accept-Language header from a Next.js request headers object. */
export function detectLocaleFromHeaders(headers: Headers): Locale {
  const raw = headers.get("accept-language");
  return detectLocaleFromAcceptLanguage(raw);
}
