import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/types";

const LOCALE_COOKIE = "spinshare.locale";

/**
 * ARCHIVE KILL-SWITCH — the single toggle that disables all payment, auth,
 * bidding, and tracking routes for the archived public portfolio.
 *
 * To re-enable the live marketplace in the future:
 *   1. Set ARCHIVED = false below.
 *   2. Populate the required env vars (see .env.example).
 *   3. Redeploy.
 *
 * While ARCHIVED = true:
 *   - All API routes except /api/health return 410 Gone JSON.
 *   - Sensitive page routes (signin, dashboard, etc.) redirect to / with ?archived=1.
 *   - The landing page, /privacy, /terms, /api/health, and static assets
 *     continue to work normally.
 */
export const ARCHIVED = true;

/** Page routes blocked while archived. */
const ARCHIVED_BLOCKED_PAGES = [
  "/signin",
  "/activate",
  "/dashboard",
  "/dev",
  "/vsix",
];

function isArchivedBlockedPage(path: string): boolean {
  return ARCHIVED_BLOCKED_PAGES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/"),
  );
}

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
 * Next.js 16 proxy (formerly `middleware`). Handles two concerns:
 *   1. Archive kill-switch — see `ARCHIVED` above.
 *   2. Locale detection — sets an `x-spinshare-locale` request header that the
 *      root layout reads, so the first server-rendered HTML is already in the
 *      user's language (no flash of the wrong locale).
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ── Archive kill-switch ────────────────────────────────────────────────
  if (ARCHIVED) {
    // Block all API routes except /api/health.
    if (path.startsWith("/api/") && path !== "/api/health") {
      return Response.json(
        {
          archived: true,
          error:
            "This feature is archived. SpinShare is no longer operating as a live ad marketplace.",
        },
        { status: 410 },
      );
    }
    // Block sensitive page routes.
    if (isArchivedBlockedPage(path)) {
      const url = new URL("/", request.url);
      url.searchParams.set("archived", "1");
      return NextResponse.redirect(url);
    }
  }

  // ── Locale detection ──────────────────────────────────────────────────
  const response = NextResponse.next();

  // 1. Highest priority: a previously persisted user choice (cookie set by
  //    the language switcher — the client also mirrors this to localStorage).
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (
    cookieLocale &&
    cookieLocale !== "auto" &&
    (LOCALES as readonly string[]).includes(cookieLocale)
  ) {
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
  // API routes ARE included so the archive kill-switch can block them.
  matcher: ["/((?!_next/|favicon.ico|.*\\..*).*)"],
};
