"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

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

  if (!signedIn) {
    return (
      <Link
        href={`/signin?next=${encodeURIComponent(pathname)}`}
        className="btn-like"
        aria-label="Sign in to like"
      >
        ♡ Like{count > 0 ? ` · ${count}` : ""}
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
      {liked ? "♥ Liked" : "♡ Like"}
      {count > 0 ? ` · ${count}` : ""}
    </button>
  );
}
