"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Code, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SegmentSlider } from "@/components/SegmentSlider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SpinShareWordmark } from "@/components/SpinShareWordmark";
import { useT } from "@/lib/i18n/locale-provider";
import "./signin.css";

import { dictionaries } from "@/lib/i18n/dictionaries";

type SignInRole = "developer" | "advertiser";

interface RoleSearchParams {
  get(name: string): string | null;
}

const enSignin = dictionaries.en.signin;

/** English sign-in copy contract for tests — mirrors `dictionaries.en.signin`. */
export const SIGNIN_PAGE_COPY = {
  headline: `${enSignin.headlinePrefix} ${enSignin.headlineHighlight}`,
  body: enSignin.body,
  panelLabel: enSignin.panelLabel,
  developerRole: enSignin.roleDeveloper,
  advertiserRole: enSignin.roleAdvertiser,
} as const;

export function resolveInitialRole(searchParams: RoleSearchParams): SignInRole {
  return searchParams.get("role") === "advertiser" ? "advertiser" : "developer";
}

/** Demo email/password per role, shown only as a local-testing convenience. */
const DEMO_CREDENTIALS: Record<SignInRole, { email: string; password: string }> = {
  developer: { email: "developer@spinshare.test", password: "spinshare" },
  advertiser: { email: "advertiser@spinshare.test", password: "spinshare" },
};

function MoneyIcon({ className = "" }: { className?: string }) {
  return (
    <span
      aria-label="money"
      role="img"
      className={`inline-grid place-items-center leading-none ${className}`}
    >
      🤑
    </span>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const t = useT();
  const [role, setRole] = useState<SignInRole>(() => resolveInitialRole(searchParams));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const callbackUrl =
    searchParams.get("callbackUrl") ||
    (role === "developer" ? "/dashboard/developer" : "/dashboard/advertiser");

  const handleOAuthSignIn = async (provider: string) => {
    setError(null);
    setLoading(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setError(t.signin.errorOAuth);
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
        setError(t.signin.errorCredentials);
        return;
      }
      window.location.assign(result.url ?? callbackUrl);
    } catch {
      setError(t.signin.errorSignIn);
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
    <div className="spinshare-container relative min-h-screen overflow-hidden bg-[linear-gradient(115deg,#e9f8ef_0%,#f3faf5_48%,#e1f5e9_100%)] px-4 py-5 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(16,185,129,0.18),transparent_31%),radial-gradient(circle_at_88%_14%,rgba(52,211,153,0.16),transparent_36%)]" />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label="SpinShare home">
          <Image
            src="/logo/spinshare-logo.png"
            alt="SpinShare Logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-[8px] object-contain shadow-[0_10px_24px_rgba(22,163,74,0.24)]"
          />
          <SpinShareWordmark className="text-xl" />
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 text-sm font-black text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.common.backToHome}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-center">
        <section className="max-w-3xl">
          <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-tight text-slate-950 sm:text-7xl lg:text-8xl">
            {t.signin.headlinePrefix}{" "}
            <span className="spinshare-hero-highlight-3d">{t.signin.headlineHighlight}</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-600 sm:text-xl">
            {t.signin.body}
          </p>

          <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
            <div className="rounded-[16px] border border-white/70 bg-white/48 p-4 shadow-[0_18px_46px_rgba(15,23,42,0.05)] backdrop-blur-xl">
              <p className="text-2xl font-black text-slate-950">60%</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {t.signin.cardRevenue}
              </p>
            </div>
            <div className="rounded-[16px] border border-white/70 bg-white/48 p-4 shadow-[0_18px_46px_rgba(15,23,42,0.05)] backdrop-blur-xl">
              <p className="text-2xl font-black text-slate-950">{t.signin.cardPrivate}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {t.signin.cardDashboard}
              </p>
            </div>
            <div className="rounded-[16px] border border-white/70 bg-white/48 p-4 shadow-[0_18px_46px_rgba(15,23,42,0.05)] backdrop-blur-xl">
              <p className="text-2xl font-black text-slate-950">{t.signin.cardLive}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {t.signin.cardPayout}
              </p>
            </div>
          </div>
        </section>

        <section
          aria-label={t.signin.panelLabel}
          className="spinshare-signin-card p-5 sm:p-6"
        >
          <SegmentSlider
            ariaLabel={t.signin.signInAs}
            value={role}
            onChange={setRole}
            options={[
              { value: "developer", label: t.signin.roleDeveloper, icon: <Code className="h-4 w-4" /> },
              { value: "advertiser", label: t.signin.roleAdvertiser, icon: <Layers className="h-4 w-4" /> },
            ]}
          />

          <div className="mt-5 space-y-3">
            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn("google")}
              disabled={loading !== null}
              className="flex min-h-12 w-full justify-center gap-3 rounded-[12px] border-slate-200 bg-white text-sm font-black text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_20px_rgba(15,23,42,0.04)] transition hover:border-emerald-500/40 hover:text-emerald-800"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {loading === "google" ? t.signin.submitting : t.signin.submit}
            </Button>

            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn("github")}
              disabled={loading !== null}
              className="flex min-h-12 w-full justify-center gap-3 rounded-[12px] border-slate-200 bg-white text-sm font-black text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_20px_rgba(15,23,42,0.04)] transition hover:border-emerald-500/40 hover:text-emerald-800"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              {loading === "github" ? t.signin.submitting : t.signin.submit}
            </Button>
          </div>

          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-emerald-900/10" />
            </div>
            <span className="relative bg-white/95 px-3 text-xs font-black uppercase tracking-widest text-emerald-800/60">
              {t.signin.orDivider}
            </span>
          </div>

          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-black uppercase tracking-wider text-emerald-900/80">
                {t.signin.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="spinshare-input min-h-11 px-3 py-2.5 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-black uppercase tracking-wider text-emerald-900/80">
                {t.signin.passwordLabel}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder={t.signin.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="spinshare-input min-h-11 px-3 py-2.5 text-sm"
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
              className="spinshare-btn-primary min-h-12 w-full justify-center rounded-[12px] text-sm"
            >
              {loading === "credentials" ? t.signin.submitting : t.signin.submit}
            </Button>
          </form>

          <div className="mt-5 rounded-[14px] border border-emerald-900/10 bg-emerald-50/70 p-4 text-center">
            <p className="text-xs font-semibold text-emerald-900/70">
              {t.signin.localTestAccount(role === "developer" ? t.signin.roleDeveloper : t.signin.roleAdvertiser)}
            </p>
            <p className="mt-0.5 text-xs font-mono text-emerald-900/80">
              {DEMO_CREDENTIALS[role].email} / {DEMO_CREDENTIALS[role].password}
            </p>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="mt-2 text-xs font-bold text-emerald-700 underline-offset-2 hover:underline"
            >
              {t.signin.useThisAccount}
            </button>
          </div>
        </section>
      </main>
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
