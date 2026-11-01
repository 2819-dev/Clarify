"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function SubscribeButton({
  channelSlug,
  channelName,
  initialSubscribed = false,
  signedIn = false,
}: {
  channelSlug: string;
  channelName: string;
  initialSubscribed?: boolean;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    const next = encodeURIComponent(pathname);
    return (
      <Link
        href={`/signin?next=${next}`}
        className="btn-subscribe"
        aria-label={`Sign in to subscribe to ${channelName}`}
      >
        Subscribe
      </Link>
    );
  }

  return (
    <div className="engage-control">
      <button
        type="button"
        className={`btn-subscribe ${subscribed ? "is-subscribed" : ""}`}
        aria-pressed={subscribed}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const res = await fetch("/api/subscriptions/toggle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ channelSlug }),
            });
            const data = await res.json();
            if (res.status === 401) {
              router.push(`/signin?next=${encodeURIComponent(pathname)}`);
              return;
            }
            if (!res.ok) {
              setError(data.error || "Could not update subscription.");
              return;
            }
            setSubscribed(Boolean(data.subscribed));
            router.refresh();
          } catch {
            setError("Could not update subscription.");
          } finally {
            setPending(false);
          }
        }}
      >
        {subscribed ? "Subscribed" : "Subscribe"}
        <span className="sr-only"> to {channelName}</span>
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
