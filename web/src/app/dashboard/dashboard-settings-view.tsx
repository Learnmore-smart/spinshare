"use client";



import { LogOut, Monitor, Moon, Sun } from "lucide-react";

import { signOut, useSession } from "next-auth/react";



import { LanguageSwitcher } from "@/components/LanguageSwitcher";

import { APP_VERSION } from "@/lib/app-meta";

import { useT } from "@/lib/i18n/locale-provider";

import { useTheme } from "@/lib/theme/theme-provider";

import type { ThemePreference } from "@/lib/theme/theme";



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



const VARIANT_STYLES = {

  developer: {

    panel: "dev-dash-panel dev-dash-rise",

    headerBorder: "border-emerald-900/8",

    eyebrow: "text-emerald-600",

    title: "text-slate-950 dark:text-emerald-50",

    themeActive:

      "border-emerald-400 bg-emerald-50 text-emerald-800 shadow-[0_0_0_1px_rgba(16,185,129,0.2)] dark:bg-emerald-950/40 dark:text-emerald-100",

    themeIdle:

      "border-emerald-900/10 bg-white/80 text-slate-600 hover:border-emerald-200 hover:text-emerald-700 dark:bg-white/5 dark:text-slate-300",

    credentials: "dev-dash-settings-credentials",

    footerBorder: "border-emerald-900/8",

  },

  advertiser: {

    panel: "adv-dash-panel adv-dash-rise",

    headerBorder: "border-amber-900/8",

    eyebrow: "text-amber-600",

    title: "text-slate-950 dark:text-amber-50",

    themeActive:

      "border-amber-400 bg-amber-50 text-amber-800 shadow-[0_0_0_1px_rgba(245,158,11,0.2)] dark:bg-amber-950/40 dark:text-amber-100",

    themeIdle:

      "border-amber-900/10 bg-white/80 text-slate-600 hover:border-amber-200 hover:text-amber-700 dark:bg-white/5 dark:text-slate-300",

    credentials: "adv-dash-settings-credentials",

    footerBorder: "border-amber-900/8",

  },

} as const;



export interface DashboardSettingsViewProps {

  variant: keyof typeof VARIANT_STYLES;

}



export function DashboardSettingsView({ variant }: DashboardSettingsViewProps) {

  const t = useT();

  const { preference, setPreference } = useTheme();

  const { data: session } = useSession();

  const styles = VARIANT_STYLES[variant];



  const email = session?.user?.email ?? "—";

  const userId =

    (session?.user as { id?: string } | undefined)?.id ?? email;



  return (

    <section className={`${styles.panel} w-full p-4 sm:p-6 lg:p-8`}>

      <header className={`border-b ${styles.headerBorder} pb-4 sm:pb-5`}>

        <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${styles.eyebrow}`}>

          SpinShare

        </p>

        <h1 className={`mt-1 text-xl font-black sm:text-2xl ${styles.title}`}>

          {t.developerDashboard.settingsTitle}

        </h1>

      </header>



      <div className="mt-6 grid gap-6 md:grid-cols-2 md:gap-8 lg:mt-8">

        <section>

          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">

            {t.developerDashboard.theme}

          </h2>

          <div className="mt-2 grid grid-cols-3 gap-2">

            {THEME_OPTIONS.map(({ value, icon: Icon }) => {

              const active = preference === value;

              return (

                <button

                  key={value}

                  type="button"

                  onClick={() => setPreference(value)}

                  aria-pressed={active}

                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-bold transition ${

                    active ? styles.themeActive : styles.themeIdle

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

          <div className="mt-2">

            <LanguageSwitcher placement="bottom" />

          </div>

        </section>



        <section className="md:col-span-2">

          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">

            {t.developerDashboard.credentials}

          </h2>

          <dl

            className={`${styles.credentials} mt-2 grid gap-4 rounded-xl border p-4 text-sm sm:grid-cols-2`}

          >

            <div className="min-w-0">

              <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">

                {t.developerDashboard.email}

              </dt>

              <dd className="mt-0.5 truncate font-bold text-slate-800 dark:text-emerald-50">

                {email}

              </dd>

            </div>

            <div className="min-w-0">

              <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">

                {t.developerDashboard.userId}

              </dt>

              <dd className="mt-0.5 truncate font-mono text-xs text-slate-600 dark:text-slate-300">

                {userId}

              </dd>

            </div>

          </dl>

        </section>



        <section>

          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">

            {t.developerDashboard.version}

          </h2>

          <p className="mt-2 font-mono text-sm font-bold text-slate-700 dark:text-slate-200">

            v{APP_VERSION}

          </p>

        </section>



        <section className="flex items-end">

          <button

            type="button"

            onClick={() => signOut({ callbackUrl: "/" })}

            className="spinshare-btn-outline inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm"

          >

            <LogOut className="h-4 w-4" aria-hidden />

            {t.navAuth.signOut}

          </button>

        </section>

      </div>

    </section>

  );

}


