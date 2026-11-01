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

function IconSun() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5h1v3h-2V2h1zm0 17h1v3h-2v-3h1zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4L4.2 5.6zm12.1 12.1 2.1 2.1-1.4 1.4-2.1-2.1 1.4-1.4zM2 11h3v2H2v-2zm17 0h3v2h-3v-2zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1-1.4-1.4zm12.1-12.1 2.1-2.1 1.4 1.4-2.1 2.1-1.4-1.4z" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.1 2a9.9 9.9 0 0 0-1 .05 10 10 0 1 0 10.85 10.9A8 8 0 0 1 12.1 2z" />
    </svg>
  );
}

function IconSystem() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4l2 3v1H8v-1l2-3H6a2 2 0 0 1-2-2V5zm2 0v10h12V5H6z" />
    </svg>
  );
}

const CYCLE: ThemePreference[] = ["system", "light", "dark"];

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

  function cycle() {
    const idx = CYCLE.indexOf(pref);
    const next = CYCLE[(idx + 1) % CYCLE.length]!;
    setPref(next);
    writePreference(next);
    applyResolved(next);
  }

  const label =
    pref === "system"
      ? "Use system theme"
      : pref === "light"
        ? "Switch to light theme"
        : "Switch to dark theme";

  return (
    <button
      type="button"
      className="yt-icon-btn theme-toggle"
      aria-label={label}
      title={label}
      data-theme-pref={pref}
      onClick={cycle}
      suppressHydrationWarning
    >
      {!ready || pref === "system" ? (
        <IconSystem />
      ) : pref === "light" ? (
        <IconSun />
      ) : (
        <IconMoon />
      )}
    </button>
  );
}
