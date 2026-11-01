export const THEME_STORAGE_KEY = "clarify_theme";
export const THEME_COOKIE = "clarify_theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemDark = false,
): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return systemDark ? "dark" : "light";
}

/** Inline boot script — runs before paint to avoid theme flash. */
export const THEME_BOOT_SCRIPT = `(()=>{try{const k="clarify_theme";let p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="system"){const m=document.cookie.match(/(?:^|; )clarify_theme=([^;]*)/);p=m?decodeURIComponent(m[1]):"system"}if(p!=="light"&&p!=="dark"&&p!=="system")p="system";const dark=window.matchMedia("(prefers-color-scheme: dark)").matches;const r=p==="dark"||(p==="system"&&dark)?"dark":"light";const root=document.documentElement;root.dataset.theme=r;root.dataset.themePref=p;root.style.colorScheme=r;root.classList.toggle("theme-dark",r==="dark")}catch(e){}})();`;
