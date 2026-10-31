"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  CONTENT_MODE_COOKIE,
  CONTENT_MODE_STORAGE_KEY,
  type ContentMode,
  parseContentMode,
} from "@/lib/content-mode";

function writePreference(mode: ContentMode) {
  try {
    window.localStorage.setItem(CONTENT_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${CONTENT_MODE_COOKIE}=${mode}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function ContentModeToggle({
  initialMode = "jewish",
}: {
  initialMode?: ContentMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ContentMode>(initialMode);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CONTENT_MODE_STORAGE_KEY);
      if (!raw) {
        writePreference(initialMode);
        return;
      }
      const stored = parseContentMode(raw);
      if (stored !== initialMode) {
        writePreference(stored);
        setMode(stored);
        startTransition(() => router.refresh());
      }
    } catch {
      /* ignore */
    }
    // Sync once on mount from localStorage → cookie for SSR.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(next: ContentMode) {
    if (next === mode) return;
    writePreference(next);
    setMode(next);
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={`content-mode-toggle ${pending ? "is-pending" : ""}`}
      role="group"
      aria-label="Catalog content mode"
    >
      <button
        type="button"
        className={`content-mode-option ${mode === "jewish" ? "is-active" : ""}`}
        aria-pressed={mode === "jewish"}
        onClick={() => select("jewish")}
      >
        Jewish Content
      </button>
      <button
        type="button"
        className={`content-mode-option ${mode === "filtered" ? "is-active" : ""}`}
        aria-pressed={mode === "filtered"}
        onClick={() => select("filtered")}
      >
        Filtered Content
      </button>
    </div>
  );
}
