"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

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
  const notifId = useId();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRoot = useRef<HTMLDivElement>(null);

  return (
    <div className="yt-header-action" ref={notifRoot}>
      <button
        type="button"
        className="yt-icon-btn"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={notifOpen}
        aria-controls={notifId}
        title="Notifications"
        onClick={() => setNotifOpen((v) => !v)}
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
          You’re all caught up. Subscribe to channels to see their latest videos
          here.
        </p>
        <Link
          href="/subscriptions"
          className="yt-header-panel-item"
          onClick={() => setNotifOpen(false)}
        >
          View subscriptions
        </Link>
      </Popover>
    </div>
  );
}
