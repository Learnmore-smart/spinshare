import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./theme.css";
import "./home.css";

export const metadata: Metadata = {
  title: "SpinShare",
  description: "Your AI is thinking. You should be earning.",
  appleWebApp: {
    title: "MyWebSite",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // `light` activates the premium light theme by default; body classes
  // pull the soft slate background + dark slate foreground tokens.
  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
