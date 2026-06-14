"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale, useSetLocale, useT } from "@/lib/i18n/locale-provider";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n/types";

/**
 * Sleek language switcher — pill button with globe + current native name,
 * opens a glass-morphism dropdown listing all supported locales.
 *
 * Auto-detected locale is shown on first visit; once the user picks manually
 * the choice is persisted in `localStorage` (handled by the provider).
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonId = useId();
  const menuId = useId();

  const current = LOCALE_LABELS[locale];

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t.common.languageLabel}: ${current.native}`}
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex h-9 items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 text-xs font-black text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-xl transition hover:border-emerald-200 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
      >
        <Globe className="h-3.5 w-3.5 text-emerald-700/80 transition group-hover:text-emerald-700" />
        <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black tracking-wider text-emerald-700">
          {current.short}
        </span>
        <span className="hidden sm:inline">{current.native}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-emerald-700" : ""
          }`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="listbox"
          aria-labelledby={buttonId}
          className="spinshare-lang-menu absolute right-0 bottom-full z-50 mb-2 w-56 origin-bottom-right overflow-hidden rounded-2xl border border-white/70 bg-white/90 p-1.5 shadow-[0_24px_60px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(180%)] [-webkit-backdrop-filter:blur(24px)_saturate(180%)]"
          style={{
            animation: "spinshare-lang-menu-in 160ms ease-out",
          }}
        >
          <p className="px-3 pb-1.5 pt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {t.common.languageLabel}
            <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">
              · {t.common.languageHint}
            </span>
          </p>
          <ul className="flex flex-col">
            {(Object.keys(LOCALE_LABELS) as Locale[]).map((code) => {
              const label = LOCALE_LABELS[code];
              const active = code === locale;
              return (
                <li key={code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(code)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                      active
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-800"
                    }`}
                  >
                    <span aria-hidden="true" className="text-base leading-none">
                      {label.flag}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-bold">{label.native}</span>
                      <span className="truncate text-[11px] font-medium text-slate-400">
                        {label.english} · {code.toUpperCase()}
                      </span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-emerald-700" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
