"use client";

import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { signOut } from "next-auth/react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { APP_VERSION } from "@/lib/app-meta";
import { useT } from "@/lib/i18n/locale-provider";
import { useTheme } from "@/lib/theme/theme-provider";
import type { ThemePreference } from "@/lib/theme/theme";

import { useDeveloperDashboard } from "./developer-dashboard-data";
import "./developer-dashboard.css";

const THEME_OPTIONS: {
  value: ThemePreference;
  icon: typeof Sun;
}[] = [
  { value: "auto", icon: Monitor },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
];

function themeLabel(value: ThemePreference, t: ReturnType<typeof useT>): string {
  if (value === "auto") return t.developerDashboard.themeAuto;
  if (value === "light") return t.developerDashboard.themeLight;
  return t.developerDashboard.themeDark;
}

export function DeveloperSettingsView() {
  const t = useT();
  const { preference, setPreference } = useTheme();
  const { user } = useDeveloperDashboard();

  return (
    <section className="dev-dash-panel dev-dash-rise p-4 sm:p-5">
      <header className="border-b border-emerald-900/8 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
          SpinShare
        </p>
        <h1 className="mt-1 text-xl font-black text-slate-950 dark:text-emerald-50">
          {t.developerDashboard.settingsTitle}
        </h1>
      </header>

      <div className="mt-5 space-y-6">
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {t.developerDashboard.theme}
          </h2>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:max-w-md">
            {THEME_OPTIONS.map(({ value, icon: Icon }) => {
              const active = preference === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPreference(value)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-bold transition ${
                    active
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800 shadow-[0_0_0_1px_rgba(16,185,129,0.2)] dark:bg-emerald-950/40 dark:text-emerald-100"
                      : "border-emerald-900/10 bg-white/80 text-slate-600 hover:border-emerald-200 hover:text-emerald-700 dark:bg-white/5 dark:text-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{themeLabel(value, t)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {t.common.languageLabel}
          </h2>
          <div className="mt-2 sm:max-w-md">
            <LanguageSwitcher placement="bottom" />
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {t.developerDashboard.credentials}
          </h2>
          <dl className="dev-dash-settings-credentials mt-2 space-y-3 rounded-xl border border-emerald-900/10 bg-white/70 p-3 text-sm sm:max-w-md dark:bg-white/5">
            <div className="min-w-0">
              <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {t.developerDashboard.email}
              </dt>
              <dd className="mt-0.5 truncate font-bold text-slate-800 dark:text-emerald-50">{user.email}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {t.developerDashboard.userId}
              </dt>
              <dd className="mt-0.5 truncate font-mono text-xs text-slate-600 dark:text-slate-300">{user.userId}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {t.developerDashboard.version}
          </h2>
          <p className="mt-2 font-mono text-sm font-bold text-slate-700 dark:text-slate-200">v{APP_VERSION}</p>
        </section>
      </div>

      <footer className="mt-6 border-t border-emerald-900/8 pt-5 sm:max-w-md">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="spinshare-btn-outline inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {t.navAuth.signOut}
        </button>
      </footer>
    </section>
  );
}
