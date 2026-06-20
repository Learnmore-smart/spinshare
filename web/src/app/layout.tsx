import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Suspense } from "react";
import "./globals.css";
import "./theme.css";
import "./home.css";
import "@/components/segment-slider.css";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { GoogleAnalyticsPageViews } from "@/components/analytics/google-analytics-page-views";
import { ThemeScript } from "@/components/theme/theme-script";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { detectLocaleFromAcceptLanguage } from "@/lib/i18n/detect-locale";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/types";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SPINSHARE_BASE_URL || "http://localhost:3000"),
  title: "SpinShare",
  description: "Your AI is thinking. You should be earning.",
  openGraph: {
    images: ["/spinshare-OG.png"],
  },
  appleWebApp: {
    title: "MyWebSite",
  },
};

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headerList = await headers();

  // Priority: middleware-set header > Accept-Language > DEFAULT_LOCALE.
  // The middleware always sets `x-spinshare-locale` for non-static routes,
  // taking the cookie (user choice) or the Accept-Language header into
  // account. We still re-validate against Accept-Language here as a
  // belt-and-braces fallback in case middleware didn't run (e.g. static
  // assets in dev).
  const middlewareLocale = headerList.get("x-spinshare-locale");
  const acceptLanguage = headerList.get("accept-language");
  const initialLocale: Locale = isLocale(middlewareLocale)
    ? middlewareLocale
    : detectLocaleFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <head>
        <ThemeScript />
        <GoogleAnalytics />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Suspense fallback={null}>
          <GoogleAnalyticsPageViews />
        </Suspense>
        <AuthSessionProvider>
          <ThemeProvider>
            <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
