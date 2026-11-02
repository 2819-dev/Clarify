"use client";

import { useEffect, useState } from "react";
import {
  THEME_COOKIE,
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  type ThemePreference,
} from "@/lib/theme";

function writePreference(pref: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(pref)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function applyResolved(pref: ThemePreference) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveTheme(pref, systemDark);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themePref = pref;
  root.style.colorScheme = resolved;
  root.classList.toggle("theme-dark", resolved === "dark");
}

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = parseThemePreference(
      window.localStorage.getItem(THEME_STORAGE_KEY),
    );
    setPref(stored);
    applyResolved(stored);
    setReady(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onSystem() {
      const current = parseThemePreference(
        window.localStorage.getItem(THEME_STORAGE_KEY),
      );
      if (current === "system") applyResolved("system");
    }
    mq.addEventListener("change", onSystem);
    return () => mq.removeEventListener("change", onSystem);
  }, []);

  function select(next: ThemePreference) {
    if (next === pref) return;
    setPref(next);
    writePreference(next);
    applyResolved(next);
  }

  return (
    <div
      className={`theme-toggle ${ready ? "is-ready" : ""}`}
      role="group"
      aria-label="Theme"
      data-theme-pref={pref}
      suppressHydrationWarning
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`theme-toggle-option ${
            pref === option.value ? "is-active" : ""
          }`}
          aria-pressed={pref === option.value}
          onClick={() => select(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
