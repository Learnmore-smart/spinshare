"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Code, Layers } from "lucide-react";

type SignInRole = "developer" | "advertiser";

interface RoleSearchParams {
  get(name: string): string | null;
}

export function resolveInitialRole(searchParams: RoleSearchParams): SignInRole {
  return searchParams.get("role") === "advertiser" ? "advertiser" : "developer";
}

/** One horizontal row of the ambient money-glyph background. */
export interface MoneyStreamRow {
  /** Scroll direction; adjacent rows alternate for a woven effect. */
  direction: "ltr" | "rtl";
  /** The repeating money glyphs rendered across the row. */
  icons: string[];
}

/** Glyph palette for the ambient background. */
const MONEY_GLYPHS = ["🤑"] as const;

function moneyGlyphAt(index: number): string {
  return MONEY_GLYPHS[index % MONEY_GLYPHS.length] ?? "🤑";
}

/**
 * Builds the diagonal money-stream rows rendered behind the sign-in card. Pure
 * and exported so the page test can assert the woven layout invariants without
 * a DOM: many rows, many glyphs per row, and alternating direction.
 */
function buildMoneyStreamRows(): MoneyStreamRow[] {
  const ROW_COUNT = 10;
  const GLYPHS_PER_ROW = 18;
  return Array.from({ length: ROW_COUNT }, (_, row): MoneyStreamRow => ({
    direction: row % 2 === 0 ? "ltr" : "rtl",
    icons: Array.from(
      { length: GLYPHS_PER_ROW },
      (_, col) => moneyGlyphAt(row + col),
    ),
  }));
}

/** Precomputed ambient background rows. */
export const MONEY_STREAM_ROWS: MoneyStreamRow[] = buildMoneyStreamRows();

/** Demo email/password per role, shown only as a local-testing convenience. */
const DEMO_CREDENTIALS: Record<SignInRole, { email: string; password: string }> = {
  developer: { email: "developer@spinshare.test", password: "spinshare" },
  advertiser: { email: "advertiser@spinshare.test", password: "spinshare" },
};

function MoneyStreamBackground() {
  const [glyphsPerRow, setGlyphsPerRow] = useState(18);

  useEffect(() => {
    const handleResize = () => {
      // Each icon + gap is 4.2rem = 67.2px (assuming 16px default font size)
      const glyphWidthPx = 67.2;
      // We target 1.8x width of the window to account for the tilted container layout
      const targetWidth = window.innerWidth * 1.8;
      const needed = Math.max(18, Math.ceil(targetWidth / glyphWidthPx));
      setGlyphsPerRow(needed);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <div aria-hidden className="money-stream-field">
        {MONEY_STREAM_ROWS.map((row, rowIndex) => {
          const icons = Array.from(
            { length: glyphsPerRow },
            (_, col) => moneyGlyphAt(rowIndex + col),
          );
          return (
            <div
              key={rowIndex}
              className="money-stream-row"
              style={{
                top: `${-8 + rowIndex * 12}%`,
              }}
            >
              <div
                className={`money-stream-track money-stream-track-${row.direction}`}
                style={{
                  animationDelay: `${rowIndex * -1.4}s`,
                  animationDuration: `${24 + (rowIndex % 4) * 4}s`,
                }}
              >
                {[...icons, ...icons].map((glyph, glyphIndex) => (
                  <span
                    key={`${rowIndex}-${glyphIndex}`}
                    className="money-stream-icon"
                  >
                    {glyph}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.56),rgba(237,247,240,0.78)_42%,rgba(242,251,246,0.95))]" />
    </>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<SignInRole>(() => resolveInitialRole(searchParams));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Read callbackUrl from query params, or default to the role-specific dashboard.
  const callbackUrl =
    searchParams.get("callbackUrl") ||
    (role === "developer" ? "/dashboard/developer" : "/dashboard/advertiser");

  const handleOAuthSignIn = async (provider: string) => {
    setError(null);
    setLoading(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setError("Something went wrong starting sign-in. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading("credentials");
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (!result || result.error) {
        setError("Incorrect email or password.");
        return;
      }
      window.location.assign(result.url ?? callbackUrl);
    } catch {
      setError("Something went wrong signing in. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const fillDemoCredentials = () => {
    const demo = DEMO_CREDENTIALS[role];
    setEmail(demo.email);
    setPassword(demo.password);
    setError(null);
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 pb-4 pt-20 sm:p-6 spinshare-container">
      <MoneyStreamBackground />

      <Link
        href="/"
        className="spinshare-back-home absolute left-4 top-4 z-20 inline-flex items-center gap-2 px-4 py-3 text-sm font-black text-emerald-800 sm:left-8 sm:top-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="z-10 w-full max-w-[420px] space-y-6">
        <Card className="spinshare-card spinshare-static spinshare-signin-card p-2 sm:p-4">
          <CardHeader className="space-y-2 pb-4 text-center">
            {/* Logo */}
            <div className="mx-auto flex h-11 w-11 items-center justify-center">
              <Image
                src="/logo/spinshare-logo.png"
                alt="SpinShare Logo"
                width={44}
                height={44}
                className="rounded-[8px] object-contain shadow-[0_10px_24px_rgba(22,163,74,0.24)]"
              />
            </div>
            <CardTitle className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              Sign in to SpinShare
            </CardTitle>
            <CardDescription className="font-semibold text-slate-600">
              Choose your role, then continue with your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role switcher */}
            <div className="grid grid-cols-2 gap-1.5 spinshare-switcher-bg">
              <button
                type="button"
                onClick={() => setRole("developer")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
                  role === "developer" ? "spinshare-switcher-active" : "spinshare-switcher-inactive"
                }`}
              >
                <Code className="h-4 w-4" />
                Developer
              </button>
              <button
                type="button"
                onClick={() => setRole("advertiser")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
                  role === "advertiser" ? "spinshare-switcher-active" : "spinshare-switcher-inactive"
                }`}
              >
                <Layers className="h-4 w-4" />
                Advertiser
              </button>
            </div>

            {/* OAuth */}
            <div className="space-y-3.5">
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("github")}
                disabled={loading !== null}
                className="spinshare-btn-outline w-full justify-center gap-3 py-6 text-sm hover:scale-[1.01] active:scale-[0.99]"
              >
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                {loading === "github" ? "Signing in..." : "Continue with GitHub"}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("google")}
                disabled={loading !== null}
                className="spinshare-btn-outline w-full justify-center gap-3 py-6 text-sm hover:scale-[1.01] active:scale-[0.99]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {loading === "google" ? "Signing in..." : "Continue with Google"}
              </Button>
            </div>

            {/* Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-emerald-900/10" />
              </div>
              <span className="relative bg-white/95 px-3 text-xs font-black uppercase tracking-widest text-emerald-800/60">
                or
              </span>
            </div>

            {/* Email / password */}
            <form onSubmit={handleCredentialsSignIn} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-black uppercase tracking-wider text-emerald-900/80">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="spinshare-input px-3 py-2.5 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-black uppercase tracking-wider text-emerald-900/80">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="spinshare-input px-3 py-2.5 text-sm"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm font-semibold text-red-600">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading !== null}
                className="spinshare-btn-primary w-full justify-center py-6 text-sm"
              >
                {loading === "credentials" ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            {/* Local test-account helper */}
            <div className="rounded-lg border border-emerald-900/10 bg-emerald-50/60 p-3 text-center">
              <p className="text-xs font-semibold text-emerald-900/70">
                Local test {role} account
              </p>
              <p className="mt-0.5 text-xs font-mono text-emerald-900/80">
                {DEMO_CREDENTIALS[role].email} / {DEMO_CREDENTIALS[role].password}
              </p>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="mt-2 text-xs font-bold text-emerald-700 underline-offset-2 hover:underline"
              >
                Use this account
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="px-2 text-center text-xs font-semibold leading-relaxed text-emerald-850/60">
          Test accounts work only in local development. Production sign-in uses Google or GitHub.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 text-sm font-medium text-slate-400">
          Loading authentication...
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
