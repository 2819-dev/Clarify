"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

function ThumbIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {filled ? (
        <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
      ) : (
        <path d="M15 5.83 17.17 8H21v2.17l-3.07 7.23H9V8.83L15 5.83M15 3 7.59 10.41C7.22 10.78 7 11.3 7 11.83V19a2 2 0 0 0 2 2h9.31c.81 0 1.55-.48 1.87-1.23l3.02-7.05c.09-.23.14-.47.14-.73v-2a2 2 0 0 0-2-2h-5.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L15 3zM1 21h4V9H1v12z" />
      )}
    </svg>
  );
}

export function LikeButton({
  videoId,
  initialLiked = false,
  initialCount = 0,
  signedIn = false,
}: {
  videoId: string;
  initialLiked?: boolean;
  initialCount?: number;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  const label = count > 0 ? String(count) : "Like";

  if (!signedIn) {
    return (
      <Link
        href={`/signin?next=${encodeURIComponent(pathname)}`}
        className="btn-like"
        aria-label="Sign in to like"
      >
        <ThumbIcon />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`btn-like ${liked ? "is-liked" : ""}`}
      aria-pressed={liked}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const res = await fetch("/api/likes/toggle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId }),
          });
          const data = await res.json();
          if (res.status === 401) {
            router.push(`/signin?next=${encodeURIComponent(pathname)}`);
            return;
          }
          if (!res.ok) return;
          setLiked(Boolean(data.liked));
          setCount(Number(data.count ?? 0));
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <ThumbIcon filled={liked} />
      <span>{label}</span>
    </button>
  );
}
