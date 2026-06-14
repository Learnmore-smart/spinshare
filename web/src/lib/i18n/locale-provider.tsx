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
import {
  DEFAULT_LOCALE,
  LOCALE_AUTO,
  LOCALES,
  STORAGE_KEY,
  type Dictionary,
  type Locale,
  type LocalePreference,
} from "./types";
import { dictionaries } from "./dictionaries";
import { detectLocaleFromNavigator } from "./detect-locale";

/** Mirror of the cookie name used in `src/middleware.ts`. */
export const COOKIE_KEY = "spinshare.locale";

interface LocaleContextValue {
  /** Resolved active locale (dictionary + `<html lang>`). */
  locale: Locale;
  /** User preference: auto (browser) or an explicit locale. */
  preference: LocalePreference;
  /** Active dictionary (already typed). */
  t: Dictionary;
  /** Switch preference. Persists to localStorage + cookie. */
  setPreference: (next: LocalePreference) => void;
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

function isLocalePreference(value: unknown): value is LocalePreference {
  return value === LOCALE_AUTO || isLocale(value);
}

function persistPreference(preference: LocalePreference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
  try {
    const oneYearSeconds = 60 * 60 * 24 * 365;
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(preference)}; Path=/; Max-Age=${oneYearSeconds}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const [preference, setPreferenceState] = useState<LocalePreference>(LOCALE_AUTO);
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [hydrated, setHydrated] = useState(false);

  // On mount: pick preference + resolved locale.
  //   1. localStorage — explicit locale or "auto"
  //   2. navigator.language when auto (or no stored value)
  //   3. initialLocale — SSR Accept-Language fallback
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === LOCALE_AUTO) {
        setPreferenceState(LOCALE_AUTO);
        setLocaleState(detectLocaleFromNavigator());
        setHydrated(true);
        return;
      }
      if (isLocale(stored)) {
        setPreferenceState(stored);
        setLocaleState(stored);
        setHydrated(true);
        return;
      }
    } catch {
      /* localStorage unavailable */
    }

    setPreferenceState(LOCALE_AUTO);
    try {
      const detected = detectLocaleFromNavigator();
      if (detected !== locale) {
        setLocaleState(detected);
      }
    } catch {
      /* navigator unavailable — keep server locale */
    }

    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // When auto, follow browser language changes.
  useEffect(() => {
    if (preference !== LOCALE_AUTO) return;

    function syncFromNavigator() {
      setLocaleState(detectLocaleFromNavigator());
    }

    syncFromNavigator();
    window.addEventListener("languagechange", syncFromNavigator);
    return () => window.removeEventListener("languagechange", syncFromNavigator);
  }, [preference]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      if (!isLocalePreference(e.newValue)) return;

      setPreferenceState(e.newValue);
      if (e.newValue === LOCALE_AUTO) {
        setLocaleState(detectLocaleFromNavigator());
      } else {
        setLocaleState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPreference = useCallback((next: LocalePreference) => {
    setPreferenceState(next);
    persistPreference(next);

    if (next === LOCALE_AUTO) {
      setLocaleState(detectLocaleFromNavigator());
    } else {
      setLocaleState(next);
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      preference,
      t: dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE],
      setPreference,
      available: LOCALES,
    }),
    [locale, preference, setPreference],
  );

  return (
    <LocaleContext.Provider value={value}>
      <div data-locale-hydrated={hydrated ? "true" : "false"} data-locale={locale} className="contents">
        {children}
      </div>
    </LocaleContext.Provider>
  );
}

export function useT(): Dictionary {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return dictionaries[DEFAULT_LOCALE];
  }
  return ctx.t;
}

export function useLocale(): Locale {
  const ctx = useContext(LocaleContext);
  if (!ctx) return DEFAULT_LOCALE;
  return ctx.locale;
}

export function useLocalePreference(): LocalePreference {
  const ctx = useContext(LocaleContext);
  if (!ctx) return LOCALE_AUTO;
  return ctx.preference;
}

export function useSetLocalePreference(): (next: LocalePreference) => void {
  const ctx = useContext(LocaleContext);
  if (!ctx) return () => {};
  return ctx.setPreference;
}

/** @deprecated Use `useSetLocalePreference` instead. */
export function useSetLocale(): (next: Locale) => void {
  const setPreference = useSetLocalePreference();
  return useCallback((next: Locale) => setPreference(next), [setPreference]);
}
