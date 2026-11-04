"use client";

import { useEffect, useState } from "react";

type Status = {
  isChild: boolean;
  linkedToParent: boolean;
  parentDisplayName?: string | null;
  disabledCategories: string[];
  totalLimitMinutes: number | null;
  totalSecondsRemaining: number | null;
  blocked: boolean;
  blockReason: string | null;
};

function formatRemaining(seconds: number | null) {
  if (seconds == null) return null;
  const m = Math.max(0, Math.ceil(seconds / 60));
  if (m <= 0) return "0 minutes left";
  return m === 1 ? "1 minute left" : `${m} minutes left`;
}

export function ChildRestrictionBanner({
  categorySlug,
}: {
  categorySlug?: string | null;
}) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick(record: boolean) {
      try {
        const res = await fetch("/api/parental/status", {
          method: record ? "POST" : "GET",
          headers: record ? { "Content-Type": "application/json" } : undefined,
          body: record
            ? JSON.stringify({ seconds: 30, categorySlug: categorySlug || undefined })
            : undefined,
        });
        const data = await res.json();
        if (!cancelled && data.status) setStatus(data.status);
      } catch {
        /* ignore */
      }
    }
    void tick(false);
    const id = window.setInterval(() => void tick(true), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [categorySlug]);

  if (!status?.linkedToParent && !status?.isChild) return null;
  if (!status.linkedToParent && !(status.disabledCategories?.length || status.totalLimitMinutes)) {
    return null;
  }

  const remaining = formatRemaining(status.totalSecondsRemaining);
  const disabled = status.disabledCategories || [];

  return (
    <div
      className={`child-restriction-banner${status.blocked ? " is-blocked" : ""}`}
      role="status"
    >
      {status.blocked ? (
        <>
          <strong>Watching paused</strong>
          {status.blockReason ? <span> {status.blockReason}</span> : null}
        </>
      ) : (
        <>
          <strong>Parental limits</strong>
          {remaining ? <span> · {remaining}</span> : null}
          {disabled.length ? (
            <span>
              {" "}
              · {disabled.length} categor
              {disabled.length === 1 ? "y" : "ies"} off
            </span>
          ) : null}
          {status.parentDisplayName ? (
            <span className="child-restriction-quiet">
              {" "}
              · {status.parentDisplayName}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
