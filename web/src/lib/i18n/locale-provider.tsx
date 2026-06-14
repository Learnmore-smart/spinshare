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

  // On mount: prefer localStorage over the server-detected locale.
  // This lets the user's explicit choice win on subsequent visits.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored) && stored !== initialLocale) {
        setLocaleState(stored);
      }
    } catch {
      /* localStorage unavailable — keep server locale */
    }
    setHydrated(true);
  }, [initialLocale]);

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
