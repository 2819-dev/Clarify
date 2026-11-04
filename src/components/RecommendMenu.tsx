"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  hideChannelClient,
  recordAffinityClient,
} from "@/lib/preferences-client";

export function RecommendMenu({
  channelSlug,
  categorySlug,
  label,
  onHidden,
}: {
  channelSlug?: string | null;
  categorySlug?: string | null;
  label?: string;
  /** Called after “Don’t recommend this channel” so the tile can hide itself. */
  onHidden?: () => void;
}) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<"more" | "hide" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!channelSlug) return null;

  async function syncServer(action: "more" | "hide") {
    try {
      await fetch("/api/recommendations/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelSlug, action }),
      });
    } catch {
      /* cookies already updated — ranking still personalizes anonymously */
    }
  }

  async function onMore() {
    setPending("more");
    recordAffinityClient({ channelSlug, categorySlug });
    await syncServer("more");
    setOpen(false);
    setPending(null);
    setToast("We’ll show more like this");
    router.refresh();
  }

  async function onHide() {
    setPending("hide");
    hideChannelClient(channelSlug!);
    await syncServer("hide");
    setOpen(false);
    setPending(null);
    onHidden?.();
    setToast("Channel won’t be recommended");
    router.refresh();
  }

  return (
    <div className="video-menu" ref={rootRef}>
      <button
        type="button"
        className="video-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="More options"
        aria-label={`More options${label ? ` for ${label}` : ""}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ⋯
      </button>
      {open ? (
        <div
          className="video-menu-panel"
          role="menu"
          id={menuId}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="video-menu-item"
            disabled={pending !== null}
            onClick={onMore}
          >
            {pending === "more" ? "Saving…" : "Show more content like this"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="video-menu-item"
            disabled={pending !== null}
            onClick={onHide}
          >
            {pending === "hide" ? "Saving…" : "Don’t recommend this channel"}
          </button>
        </div>
      ) : null}
      {toast ? (
        <p className="video-menu-toast" role="status">
          {toast}
        </p>
      ) : null}
    </div>
  );
}
