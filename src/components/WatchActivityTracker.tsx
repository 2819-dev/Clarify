"use client";

import { useEffect } from "react";
import {
  hydratePreferencesCookies,
  recordWatchActivityClient,
} from "@/lib/preferences-client";

export function WatchActivityTracker({
  channelSlug,
  categorySlug,
}: {
  channelSlug?: string | null;
  categorySlug?: string | null;
}) {
  useEffect(() => {
    hydratePreferencesCookies();
    recordWatchActivityClient({ channelSlug, categorySlug });
  }, [channelSlug, categorySlug]);

  return null;
}
