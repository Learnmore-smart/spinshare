import { THEME_STORAGE_KEY } from "@/lib/theme/theme";

/** Runs before React hydrates to apply saved theme without a flash. */
export function ThemeScript() {
  const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k)||"auto";var d=p==="dark"||(p==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(d?"dark":"light");}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
