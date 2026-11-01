"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function WatchDescription({
  text,
  meta,
  hideEmptyBody = false,
}: {
  text: string | null | undefined;
  meta?: ReactNode;
  /** When true, omit the muted empty-body line (Shorts already show channel in-frame). */
  hideEmptyBody?: boolean;
}) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const body = text?.trim() || "";

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || expanded) return;
    const measure = () => {
      setClamped(el.scrollHeight > el.clientHeight + 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [body, expanded]);

  if (!body && hideEmptyBody && !meta) return null;

  return (
    <div
      className={`watch-desc-card${expanded ? " is-expanded" : ""}${
        !body ? " is-meta-only" : ""
      }`}
    >
      {meta}
      {body ? (
        <p
          ref={bodyRef}
          className={`desc${expanded ? "" : " is-clamped"}`}
        >
          {body}
        </p>
      ) : hideEmptyBody ? null : (
        <p className="desc is-muted">No description provided.</p>
      )}
      {body && (clamped || expanded) ? (
        <button
          type="button"
          className="watch-desc-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "…more"}
        </button>
      ) : null}
    </div>
  );
}
