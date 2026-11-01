"use client";

import { useState } from "react";

export function ShareButton({
  title,
  layout = "row",
}: {
  title?: string;
  layout?: "row" | "stack";
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({ title: title || document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        /* ignore */
      }
    }
  }

  const label = copied ? "Copied" : "Share";
  const icon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
    </svg>
  );

  if (layout === "stack") {
    return (
      <button
        type="button"
        className={`shorts-action ${copied ? "is-copied" : ""}`}
        onClick={share}
        aria-label={label}
      >
        <span className="shorts-action-icon">{icon}</span>
        <span className="shorts-action-label">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`btn-share ${copied ? "is-copied" : ""}`}
      onClick={share}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
