"use client";

import { useEffect } from "react";
import {
  hydratePreferencesCookies,
  recordWatchActivityClient,
} from "@/lib/preferences-client";

function anonKey(): string {
  const key = "clarify_anon";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `a_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    return `a_${Date.now()}`;
  }
}

export function WatchActivityTracker({
  videoId,
  channelSlug,
  categorySlug,
}: {
  videoId?: string | null;
  channelSlug?: string | null;
  categorySlug?: string | null;
}) {
  useEffect(() => {
    hydratePreferencesCookies();
    recordWatchActivityClient({ channelSlug, categorySlug });
    if (!videoId) return;
    const controller = new AbortController();
    void fetch("/api/views/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, anonKey: anonKey() }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      /* ignore network blips — ranking still works without every ping */
    });
    return () => controller.abort();
  }, [videoId, channelSlug, categorySlug]);

  return null;
}
