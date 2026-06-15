"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

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

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="spinshare-signin-stat">
      <p className="text-xl font-black leading-none text-slate-950">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const t = useT();
  const [role, setRole] = useState<SignInRole>(() => resolveInitialRole(searchParams));
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

  const bullets = [
    t.signin.bulletShare,
    t.signin.bulletMinView,
    t.signin.bulletNoUpload,
    t.signin.bulletExtension,
  ];

  return (
    <div className="spinshare-container relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,#f8fafc_0%,#f1f5f9_52%,#eef2f7_100%)] px-4 py-4 sm:px-6 sm:py-5">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label="SpinShare home">
          <Image
            src="/logo/spinshare-logo.png"
            alt="SpinShare Logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-[8px] object-contain shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
          />
          <SpinShareWordmark className="text-xl" />
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/"
            className="spinshare-signin-glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-black text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.common.backToHome}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-68px)] max-w-7xl gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center lg:gap-10 lg:py-8">
        <section className="max-w-3xl">
          <h1 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            {t.signin.headlinePrefix}{" "}
            <span className="spinshare-hero-highlight-3d">{t.signin.headlineHighlight}</span>
          </h1>

          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600">
            {t.signin.body}
          </p>

          <div className="mt-5 grid max-w-2xl grid-cols-3 gap-2">
            <StatCell value="60%" label={t.signin.cardRevenue} />
            <StatCell value={t.signin.cardPrivate} label={t.signin.cardDashboard} />
            <StatCell value={t.signin.cardLive} label={t.signin.cardPayout} />
          </div>

          <ul className="mt-4 grid max-w-2xl gap-1.5 text-sm font-semibold leading-6 text-slate-600 sm:grid-cols-2">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span className="text-slate-400" aria-hidden="true">
                  —
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
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
              { value: "developer", label: t.signin.roleDeveloper },
              { value: "advertiser", label: t.signin.roleAdvertiser },
            ]}
          />

          <div className="mt-5 space-y-3">
            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn("google")}
              disabled={loading !== null}
              className="flex min-h-12 w-full justify-center gap-3 rounded-[12px] border-slate-200 bg-white text-sm font-black text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_20px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:text-slate-950"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {loading === "google" ? t.signin.submitting : t.signin.submitGoogle}
            </Button>

            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn("github")}
              disabled={loading !== null}
              className="flex min-h-12 w-full justify-center gap-3 rounded-[12px] border-slate-200 bg-white text-sm font-black text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_20px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:text-slate-950"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              {loading === "github" ? t.signin.submitting : t.signin.submitGithub}
            </Button>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
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
