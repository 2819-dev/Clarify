"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PREFS_EVENT } from "@/lib/preferences";
import {
  getSubscriptionsClient,
  hydratePreferencesCookies,
  toggleSubscriptionClient,
} from "@/lib/preferences-client";

export function SubscribeButton({
  channelSlug,
  channelName,
}: {
  channelSlug: string;
  channelName: string;
}) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydratePreferencesCookies();
    const sync = () => {
      setSubscribed(getSubscriptionsClient().includes(channelSlug.toLowerCase()));
      setReady(true);
    };
    sync();
    window.addEventListener(PREFS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PREFS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [channelSlug]);

  return (
    <button
      type="button"
      className={`btn-subscribe ${subscribed ? "is-subscribed" : ""}`}
      aria-pressed={subscribed}
      disabled={!ready}
      onClick={() => {
        const next = toggleSubscriptionClient(channelSlug);
        setSubscribed(next);
        // Refresh RSC tree so sidebar / home shelves read the updated cookie.
        router.refresh();
      }}
    >
      {subscribed ? "Subscribed" : "Subscribe"}
      <span className="sr-only"> to {channelName}</span>
    </button>
  );
}
