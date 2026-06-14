"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Code, Layers, Home, LogIn, Zap, ArrowRight } from "lucide-react";

import { SpinShareWordmark } from "@/components/SpinShareWordmark";

const DEV_ACCOUNTS = {
  developer: { email: "developer@spinshare.test", password: "spinshare" },
  advertiser: { email: "advertiser@spinshare.test", password: "spinshare" },
} as const;

const PAGES = [
  { href: "/", label: "Home", icon: Home },
  { href: "/signin", label: "Sign In", icon: LogIn },
  { href: "/dashboard/developer", label: "Developer Dashboard", icon: Code },
  { href: "/dashboard/advertiser", label: "Advertiser Dashboard", icon: Layers },
  { href: "/activate", label: "Device Activation", icon: Zap },
] as const;

function QuickSignInButton({
  role,
  onSignIn,
  loading,
}: {
  role: "developer" | "advertiser";
  onSignIn: (role: "developer" | "advertiser") => void;
  loading: string | null;
}) {
  const Icon = role === "developer" ? Code : Layers;
  const callbackUrl =
    role === "developer" ? "/dashboard/developer" : "/dashboard/advertiser";

  return (
    <button
      type="button"
      onClick={() => onSignIn(role)}
      disabled={loading !== null}
      className="group liquid-glass flex items-center gap-4 p-5 text-left"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-950">
          Sign in as {role === "developer" ? "Developer" : "Advertiser"}
        </p>
        <p className="mt-0.5 truncate text-xs font-mono text-slate-500">
          {DEV_ACCOUNTS[role].email}
        </p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
    </button>
  );
}

export default function DevPageClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuickSignIn = async (role: "developer" | "advertiser") => {
    setError(null);
    setLoading(role);
    const callbackUrl =
      role === "developer" ? "/dashboard/developer" : "/dashboard/advertiser";
    try {
      const result = await signIn("credentials", {
        email: DEV_ACCOUNTS[role].email,
        password: DEV_ACCOUNTS[role].password,
        redirect: false,
        callbackUrl,
      });
      if (!result || result.error) {
        setError(`Failed to sign in as ${role}. Credentials provider may not be enabled.`);
        return;
      }
      window.location.assign(result.url ?? callbackUrl);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="spinshare-container relative min-h-screen overflow-hidden bg-[linear-gradient(115deg,#e9f8ef_0%,#f3faf5_48%,#e1f5e9_100%)] px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(16,185,129,0.18),transparent_31%),radial-gradient(circle_at_88%_14%,rgba(52,211,153,0.16),transparent_36%)]" />

      <header className="relative z-20 mx-auto flex max-w-3xl items-center justify-between">
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
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700">
          Dev Mode
        </span>
      </header>

      <main className="relative z-10 mx-auto mt-8 max-w-3xl space-y-8">
        <section>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Dev <span className="spinshare-hero-highlight-3d">Dashboard</span>
          </h1>
          <p className="mt-3 text-base font-semibold leading-7 text-slate-600">
            Quick access to all pages. One-click sign-in with test accounts.
          </p>
        </section>

        {error && (
          <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section>
          <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
            Quick Sign In
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickSignInButton role="developer" onSignIn={handleQuickSignIn} loading={loading} />
            <QuickSignInButton role="advertiser" onSignIn={handleQuickSignIn} loading={loading} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
            Navigate
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAGES.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-[14px] border border-white/70 bg-white/48 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur transition hover:border-emerald-500/30 hover:bg-white/70 hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
              >
                <Icon className="h-4 w-4 text-slate-400 transition group-hover:text-emerald-600" />
                <span className="text-sm font-bold text-slate-700 transition group-hover:text-emerald-800">
                  {label}
                </span>
                <span className="ml-auto text-xs font-mono text-slate-400">{href}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
