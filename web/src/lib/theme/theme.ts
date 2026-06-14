export type ThemePreference = "auto" | "light" | "dark";

export const THEME_STORAGE_KEY = "spinshare.theme";

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "auto" || value === "light" || value === "dark";
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyResolvedTheme(resolved: "light" | "dark"): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}
