export const LOCALES = ["en", "zh", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, { native: string; english: string; short: string; flag: string }> = {
  en: { native: "English", english: "English", short: "EN", flag: "🇺🇸" },
  zh: { native: "中文", english: "Chinese", short: "中", flag: "🇨🇳" },
  fr: { native: "Français", english: "French", short: "FR", flag: "🇫🇷" },
};

/**
 * Browser-only flag. `true` after the user has interacted with the switcher
 * (or after we've hydrated and read localStorage). Used to gate animations
 * during SSR/initial hydration.
 */
export const STORAGE_KEY = "spinshare.locale";

/** Translation dictionary shape. Add keys here as you add translated strings. */
export interface Dictionary {
  nav: {
    money: string;
    marketDepth: string;
    howItPays: string;
    advertisers: string;
    userLogin: string;
    install: string;
    home: string;
  };
  home: {
    heroLine1: string;
    heroHighlight: string;
    heroSub: string;
    heroShare: (pct: number) => string;
    stockClaude: string;
    withSpinShare: string;
    ctaInstall: string;
    ctaInstallSub: string;
    ctaEarning: string;
    learnAdCopy: string;
    footerCopy: string;
    navLogin: string;
    navAds: string;
  };
  signin: {
    headlinePrefix: string;
    headlineHighlight: string;
    body: string;
    cardRevenue: string;
    cardDashboard: string;
    cardPayout: string;
    panelLabel: string;
    roleDeveloper: string;
    roleAdvertiser: string;
    submit: string;
    submitting: string;
  };
  privacy: {
    eyebrow: string;
    titlePrefix: string;
    titleSuffix: string;
    lastUpdated: (date: string) => string;
    readTerms: string;
  };
  terms: {
    eyebrow: string;
    titlePrefix: string;
    titleSuffix: string;
    lastUpdated: (date: string) => string;
    readPrivacy: string;
  };
  notFound: {
    title: string;
    body: string;
    sub: string;
  };
  common: {
    backToHome: string;
    languageLabel: string;
    languageHint: string;
  };
}
