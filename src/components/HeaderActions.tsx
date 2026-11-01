"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

function IconCreate() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 13h-3v3h-2v-3H6v-2h3V8h2v3h3v2zm-2-9C6.48 4 2 8.48 2 14s4.48 10 10 10 10-4.48 10-10S17.52 4 12 4zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}

function Popover({
  open,
  id,
  title,
  children,
  onClose,
}: {
  open: boolean;
  id: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="yt-header-panel" role="dialog" aria-label={title} id={id} ref={ref}>
      <p className="yt-header-panel-title">{title}</p>
      {children}
    </div>
  );
}

export function HeaderActions() {
  const createId = useId();
  const notifId = useId();
  const [createOpen, setCreateOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const createRoot = useRef<HTMLDivElement>(null);
  const notifRoot = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="yt-header-action" ref={createRoot}>
        <button
          type="button"
          className="yt-icon-btn"
          aria-label="Create"
          aria-haspopup="dialog"
          aria-expanded={createOpen}
          aria-controls={createId}
          title="Create"
          onClick={() => {
            setNotifOpen(false);
            setCreateOpen((v) => !v);
          }}
        >
          <IconCreate />
        </button>
        <Popover
          open={createOpen}
          id={createId}
          title="Create"
          onClose={() => setCreateOpen(false)}
        >
          <p className="yt-header-panel-copy">
            Clarify is a curated catalog — uploads stay on YouTube. Explore
            channels to subscribe, or report anything that doesn’t belong.
          </p>
          <Link
            href="/channels"
            className="yt-header-panel-item"
            onClick={() => setCreateOpen(false)}
          >
            Explore channels
          </Link>
          <Link
            href="/categories"
            className="yt-header-panel-item"
            onClick={() => setCreateOpen(false)}
          >
            Browse categories
          </Link>
          <Link
            href="/#report"
            className="yt-header-panel-item"
            onClick={() => setCreateOpen(false)}
          >
            Report a video
          </Link>
        </Popover>
      </div>

      <div className="yt-header-action" ref={notifRoot}>
        <button
          type="button"
          className="yt-icon-btn"
          aria-label="Notifications"
          aria-haspopup="dialog"
          aria-expanded={notifOpen}
          aria-controls={notifId}
          title="Notifications"
          onClick={() => {
            setCreateOpen(false);
            setNotifOpen((v) => !v);
          }}
        >
          <IconBell />
        </button>
        <Popover
          open={notifOpen}
          id={notifId}
          title="Notifications"
          onClose={() => setNotifOpen(false)}
        >
          <p className="yt-header-panel-empty">
            No new notifications. Subscribe to channels to keep up with safe
            uploads in your catalog.
          </p>
          <Link
            href="/subscriptions"
            className="yt-header-panel-item"
            onClick={() => setNotifOpen(false)}
          >
            Go to subscriptions
          </Link>
        </Popover>
      </div>
    </>
  );
}
