"use client";

import { useEffect } from "react";
import { hydratePreferencesCookies } from "@/lib/preferences-client";

/** Sync localStorage ↔ cookies so SSR shelves can read subscriptions/activity. */
export function PrefsHydrator() {
  useEffect(() => {
    hydratePreferencesCookies();
  }, []);
  return null;
}
