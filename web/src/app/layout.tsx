import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";
import "./theme.css";
import "./home.css";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { detectLocaleFromHeaders } from "@/lib/i18n/detect-locale";

export const metadata: Metadata = {
  title: "SpinShare",
  description: "Your AI is thinking. You should be earning.",
  appleWebApp: {
    title: "MyWebSite",
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Server-detect the user's preferred locale from the Accept-Language header.
  // The client provider can later override this with a localStorage value
  // (or the user's manual selection from the switcher).
  const initialLocale = detectLocaleFromHeaders(headers());

  return (
    <html lang={initialLocale} className="light" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
