# LanguageSwitcher

## Purpose
Pill-shaped language switcher with globe icon and native locale name. Opens a glass-morphism dropdown listing supported locales (en, zh, fr).

## Planned changes (2026-06-14)
- Dropdown panel: opaque `bg-white` (dark: `#0f1613`), no backdrop blur.
- Selected locale: emerald fill + inset ring. Hover on others: neutral slate only.

## Constraints
- Client component; uses `LocaleProvider` for locale state and `localStorage` persistence.
- Dropdown placement: `top` (default, opens above trigger — nav/footer) or `bottom` (settings/forms).
- `variant="list"` still available for always-visible lists; settings uses default dropdown + `placement="bottom"`.

## Dependencies
- `@/lib/i18n/locale-provider`
- `@/lib/i18n/types` (`LOCALE_LABELS`, `Locale`)
- `lucide-react` icons
