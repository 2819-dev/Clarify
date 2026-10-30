"use client";

import { FormEvent, useState } from "react";

export function ReportForm({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not send report");
      }
      setStatus("done");
      setReason("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send report");
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        Report
      </button>
    );
  }

  return (
    <div className="report-panel" role="dialog" aria-labelledby="report-title">
      <h2 id="report-title">What is wrong with this video?</h2>
      <p className="report-help">
        Tell us what feels unsafe or out of place. An admin will review it.
      </p>
      {status === "done" ? (
        <div className="report-thanks">
          <p>Thanks — your report was saved.</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setOpen(false);
              setStatus("idle");
            }}
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="report-form">
          <label htmlFor="report-reason" className="sr-only">
            Reason
          </label>
          <textarea
            id="report-reason"
            name="reason"
            required
            minLength={3}
            maxLength={2000}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the issue…"
            disabled={status === "saving"}
          />
          {error ? <p className="form-error">{error}</p> : null}
          <div className="report-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setOpen(false);
                setStatus("idle");
                setError(null);
              }}
              disabled={status === "saving"}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={status === "saving" || reason.trim().length < 3}
            >
              {status === "saving" ? "Sending…" : "Submit report"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
