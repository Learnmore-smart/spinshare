"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, LOCALES, STORAGE_KEY, type Dictionary, type Locale } from "./types";
import { dictionaries } from "./dictionaries";
import { detectLocaleFromAcceptLanguage } from "./detect-locale";

/** Mirror of the cookie name used in `src/middleware.ts`. */
export const COOKIE_KEY = "spinshare.locale";

interface LocaleContextValue {
  /** Active locale. */
  locale: Locale;
  /** Active dictionary (already typed). */
  t: Dictionary;
  /** Switch locale. Persists to localStorage and updates <html lang>. */
  setLocale: (next: Locale) => void;
  /** All supported locales — handy for the language switcher. */
  available: typeof LOCALES;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  /** Locale detected on the server (from Accept-Language). */
  initialLocale: Locale;
  children: ReactNode;
}

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [hydrated, setHydrated] = useState(false);

  // On mount: pick the best locale in priority order.
  //   1. localStorage — the user's explicit, persistent choice.
  //   2. navigator.language — the browser's preferred UI language
  //      (more reliable than the SSR'd Accept-Language header, which
  //      proxies and privacy extensions can strip).
  //   3. initialLocale — what the server detected from Accept-Language.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored)) {
        if (stored !== locale) {
          setLocaleState(stored);
        }
        setHydrated(true);
        return;
      }
    } catch {
      /* localStorage unavailable — fall through to navigator check */
    }

    try {
      const navLang =
        window.navigator?.language ??
        // Older WebKit fallback.
        (window.navigator as { userLanguage?: string } | undefined)?.userLanguage ??
        null;
      if (navLang) {
        const detected = detectLocaleFromAcceptLanguage(navLang);
        if (detected !== locale) {
          setLocaleState(detected);
        }
      }
    } catch {
      /* navigator unavailable — keep server locale */
    }

    setHydrated(true);
    // Intentionally run once on mount; subsequent prop changes shouldn't
    // override the user's manual selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang="..."> in sync with the active locale so AT and search
  // engines see the right language.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // Cross-tab: if the user changes language in another tab, mirror it.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      if (isLocale(e.newValue)) {
        setLocaleState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    // Mirror the choice to a cookie so the middleware (and any future
    // server-side rendering) sees the user's preference on the very next
    // request, with no flash of the wrong language.
    try {
      // 1 year, root path, Lax for sane defaults.
      const oneYearSeconds = 60 * 60 * 24 * 365;
      document.cookie = `${COOKIE_KEY}=${encodeURIComponent(next)}; Path=/; Max-Age=${oneYearSeconds}; SameSite=Lax`;
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE],
      setLocale,
      available: LOCALES,
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>
      {/* `data-locale-hydrated` lets components gate animations on hydration
          so the first paint matches the SSR'd locale without a flash. */}
      <div data-locale-hydrated={hydrated ? "true" : "false"} data-locale={locale} className="contents">
        {children}
      </div>
    </LocaleContext.Provider>
  );
}

export function useT(): Dictionary {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Fall back to English dictionary if used outside provider — keeps tests
    // and one-off renders happy.
    return dictionaries[DEFAULT_LOCALE];
  }
  return ctx.t;
}

export function useLocale(): Locale {
  const ctx = useContext(LocaleContext);
  if (!ctx) return DEFAULT_LOCALE;
  return ctx.locale;
}

export function useSetLocale(): (next: Locale) => void {
  const ctx = useContext(LocaleContext);
  if (!ctx) return () => {};
  return ctx.setLocale;
}
