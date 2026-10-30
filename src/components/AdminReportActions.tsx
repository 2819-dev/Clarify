"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "deny") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Update failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
      setBusy(null);
    }
  }

  return (
    <div className="admin-actions">
      <button
        type="button"
        className="btn-danger"
        disabled={busy !== null}
        onClick={() => act("approve")}
      >
        {busy === "approve" ? "Removing…" : "Approve — remove video"}
      </button>
      <button
        type="button"
        className="btn-secondary"
        disabled={busy !== null}
        onClick={() => act("deny")}
      >
        {busy === "deny" ? "Keeping…" : "Deny — keep video"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
