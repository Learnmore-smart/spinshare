import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/types";

const LOCALE_COOKIE = "spinshare.locale";

/**
 * Pick the best supported locale from an Accept-Language header value.
 * Mirrors the parsing done client-side in `detectLocaleFromAcceptLanguage`
 * so SSR and client agree on the first paint.
 */
function pickLocaleFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const candidates = header
    .split(",")
    .map((part) => {
      const [rawTag] = part.trim().split(";");
      const tag = (rawTag ?? "").trim().toLowerCase();
      return tag;
    })
    .filter((tag) => tag.length > 0);
  for (const tag of candidates) {
    const base = tag.split("-")[0] ?? "";
    if (base && (LOCALES as readonly string[]).includes(base)) {
      return base as Locale;
    }
  }
  return DEFAULT_LOCALE;
}

/**
 * Next.js 16 renamed `middleware` to `proxy`. We use it to set an
 * `x-spinshare-locale` request header that the root layout reads, so the
 * first server-rendered HTML is already in the user's language — no flash
 * of the wrong locale.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // 1. Highest priority: a previously persisted user choice (cookie set by
  //    the language switcher — the client also mirrors this to localStorage).
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && cookieLocale !== "auto" && (LOCALES as readonly string[]).includes(cookieLocale)) {
    response.headers.set("x-spinshare-locale", cookieLocale);
    return response;
  }

  // 2. Otherwise, auto-detect from the browser's Accept-Language header.
  const acceptLanguage = request.headers.get("accept-language");
  const detected = pickLocaleFromAcceptLanguage(acceptLanguage);
  response.headers.set("x-spinshare-locale", detected);
  return response;
}

export const config = {
  // Run on all routes except Next.js internals and static files.
  matcher: ["/((?!_next/|api/|favicon.ico|.*\\..*).*)"],
};
