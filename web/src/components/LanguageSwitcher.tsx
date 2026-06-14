"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Globe, Monitor } from "lucide-react";
import {
  useLocale,
  useLocalePreference,
  useSetLocalePreference,
  useT,
} from "@/lib/i18n/locale-provider";
import { LOCALE_AUTO, LOCALE_LABELS, type Locale, type LocalePreference } from "@/lib/i18n/types";
import "./language-switcher.css";

const optionClass = (active: boolean, list = false) =>
  list
    ? `flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
        active
          ? "border-emerald-400/50 bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-300/40 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-100"
          : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-transparent dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8 dark:hover:text-slate-100"
      }`
    : `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
        active
          ? "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-300/40 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-500/30"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-slate-100"
      }`;

/**
 * Sleek language switcher — pill button with globe + current choice,
 * opens a dropdown with Auto (browser) plus explicit locale options.
 *
 * `variant="list"` renders an always-visible vertical list (settings panel).
 */
export function LanguageSwitcher({
  variant = "dropdown",
  placement = "top",
}: {
  variant?: "dropdown" | "list";
  /** Dropdown menu opens above (nav/footer) or below (settings/forms). */
  placement?: "top" | "bottom";
}) {
  const locale = useLocale();
  const preference = useLocalePreference();
  const setPreference = useSetLocalePreference();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonId = useId();
  const menuId = useId();

  const current = LOCALE_LABELS[locale];
  const triggerLabel = preference === LOCALE_AUTO ? t.common.languageAuto : current.native;

  useEffect(() => {
    if (open) {
      setMenuMounted(true);
      setMenuClosing(false);
    } else if (menuMounted) {
      setMenuClosing(true);
    }
  }, [open, menuMounted]);

  function handleMenuAnimationEnd() {
    if (menuClosing) {
      setMenuMounted(false);
      setMenuClosing(false);
    }
  }

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

  function pick(next: LocalePreference) {
    setPreference(next);
    setOpen(false);
  }

  function renderOptions(list = false) {
    const autoActive = preference === LOCALE_AUTO;

    return (
      <>
        <li>
          <button
            type="button"
            role="option"
            aria-selected={autoActive}
            onClick={() => pick(LOCALE_AUTO)}
            className={optionClass(autoActive, list)}
          >
            <Monitor className="h-4 w-4 shrink-0 text-emerald-700/80" aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-bold">{t.common.languageAuto}</span>
            </span>
            {autoActive && <Check className="h-4 w-4 shrink-0 text-emerald-700" />}
          </button>
        </li>
        {(Object.keys(LOCALE_LABELS) as Locale[]).map((code) => {
          const label = LOCALE_LABELS[code];
          const active = preference !== LOCALE_AUTO && code === locale;
          return (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pick(code)}
                className={optionClass(active, list)}
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
      </>
    );
  }

  if (variant === "list") {
    return (
      <ul className="flex flex-col gap-1" role="listbox" aria-label={t.common.languageLabel}>
        {renderOptions(true)}
      </ul>
    );
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t.common.languageLabel}: ${triggerLabel}`}
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex h-9 items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 text-xs font-black text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-xl transition hover:border-emerald-200 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
      >
        <Globe className="h-3.5 w-3.5 text-emerald-700/80 transition group-hover:text-emerald-700" />
        <span>{triggerLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0.24,1)] ${
            open ? "rotate-180 text-emerald-700" : ""
          }`}
        />
      </button>

      {menuMounted && (
        <div
          id={menuId}
          role="listbox"
          aria-labelledby={buttonId}
          onAnimationEnd={handleMenuAnimationEnd}
          className={`spinshare-lang-menu absolute z-50 w-56 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)] dark:border-emerald-900/25 dark:bg-[#0f1613] ${
            placement === "bottom"
              ? "spinshare-lang-menu--anchor-bottom left-0 top-full mt-2 origin-top-left"
              : "spinshare-lang-menu--anchor-top right-0 bottom-full mb-2 origin-bottom-right"
          } ${menuClosing ? "spinshare-lang-menu--exit" : "spinshare-lang-menu--enter"}`}
        >
          <p className="px-3 pb-1.5 pt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {t.common.languageLabel}
          </p>
          <ul className="flex flex-col">{renderOptions()}</ul>
        </div>
      )}
    </div>
  );
}
