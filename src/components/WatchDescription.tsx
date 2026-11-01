"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function WatchDescription({
  text,
  meta,
}: {
  text: string | null | undefined;
  meta?: ReactNode;
}) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

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
  }, [text, expanded]);

  return (
    <div className={`watch-desc-card${expanded ? " is-expanded" : ""}`}>
      {meta}
      {text ? (
        <p
          ref={bodyRef}
          className={`desc${expanded ? "" : " is-clamped"}`}
        >
          {text}
        </p>
      ) : (
        <p className="desc is-muted">No description provided.</p>
      )}
      {text && (clamped || expanded) ? (
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
