"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type ChildRow = {
  id: string;
  email: string;
  display_name: string;
  username: string | null;
  disabled_categories: string[] | null;
  total_limit_minutes: number | null;
  category_limits: Record<string, number> | null;
  child_age: number | null;
};

type OwnStatus = {
  isChild: boolean;
  linkedToParent: boolean;
  parentDisplayName?: string | null;
  disabledCategories: string[];
  totalLimitMinutes: number | null;
  totalSecondsRemaining: number | null;
  blocked: boolean;
  blockReason: string | null;
  childAge: number | null;
} | null;

const CATEGORY_OPTIONS = [
  { slug: "news", label: "News" },
  { slug: "music", label: "Music" },
  { slug: "comedy", label: "Comedy" },
  { slug: "gaming", label: "Gaming" },
  { slug: "sports", label: "Sports" },
  { slug: "community", label: "Community" },
  { slug: "stories", label: "Stories" },
  { slug: "holidays", label: "Holidays" },
];

function formatRemaining(seconds: number | null) {
  if (seconds == null) return null;
  const m = Math.ceil(seconds / 60);
  if (m <= 0) return "Time’s up for today";
  if (m === 1) return "1 minute left today";
  return `${m} minutes left today`;
}

export function ParentalControlsPanel({
  signedIn,
}: {
  signedIn: boolean;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"child" | "parent">("child");
  const [code, setCode] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(0);
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState("");
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [ownStatus, setOwnStatus] = useState<OwnStatus>(null);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [age, setAge] = useState(8);
  const [disabled, setDisabled] = useState<string[]>([]);
  const [totalLimit, setTotalLimit] = useState<number | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshCode = useCallback(async () => {
    const res = await fetch("/api/parental/device-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asChildDevice: true,
        deviceKey: deviceKey || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not get code");
    setCode(data.code);
    setExpiresIn(data.expiresIn);
    setDeviceKey(data.deviceKey);
    try {
      window.localStorage.setItem("clarify_device_key", data.deviceKey);
    } catch {
      /* ignore */
    }
  }, [deviceKey]);

  const refreshParentData = useCallback(async () => {
    if (!signedIn) return;
    const res = await fetch("/api/parental/settings");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load");
    setChildren(data.children || []);
    setOwnStatus(data.ownStatus || null);
    if (!selectedChild && data.children?.[0]?.id) {
      setSelectedChild(data.children[0].id);
    }
  }, [signedIn, selectedChild]);

  useEffect(() => {
    if (!open) return;
    try {
      const stored = window.localStorage.getItem("clarify_device_key");
      if (stored && !deviceKey) setDeviceKey(stored);
    } catch {
      /* ignore */
    }
  }, [open, deviceKey]);

  useEffect(() => {
    if (!open) return;
    void refreshCode().catch((err) => setError(err.message));
    void refreshParentData().catch(() => {
      /* guest ok */
    });
  }, [open, refreshCode, refreshParentData]);

  useEffect(() => {
    if (!open || !code) return;
    const t = window.setInterval(() => {
      setExpiresIn((s) => {
        if (s <= 1) {
          void refreshCode().catch(() => undefined);
          return 300;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [open, code, refreshCode]);

  useEffect(() => {
    const child = children.find((c) => c.id === selectedChild);
    if (!child) return;
    setDisabled(child.disabled_categories || []);
    setTotalLimit(child.total_limit_minutes ?? "");
    setAge(child.child_age || 8);
  }, [children, selectedChild]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  async function linkChild() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/parental/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: linkCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Link failed");
      setMessage("Child account linked.");
      setLinkCode("");
      await refreshParentData();
      setTab("parent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(applyAgeAssist = false) {
    if (!selectedChild) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/parental/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childUserId: selectedChild,
          disabledCategories: disabled,
          totalLimitMinutes: totalLimit === "" ? null : Number(totalLimit),
          childAge: age,
          applyAgeAssist,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage(data.assistNote || "Parental settings saved.");
      if (data.settings) {
        setDisabled(data.settings.disabled_categories || []);
        setTotalLimit(data.settings.total_limit_minutes ?? "");
      }
      await refreshParentData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="yt-header-action" ref={rootRef}>
      <button
        type="button"
        className="yt-icon-btn"
        aria-label="Parental controls"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        title="Parental controls"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      </button>

      {open ? (
        <div
          className="yt-header-panel parental-panel"
          role="dialog"
          aria-label="Parental controls"
          id={panelId}
        >
          <p className="yt-header-panel-title">Parental controls</p>
          <p className="yt-header-panel-empty">
            Link a child’s device with a 5-minute code, disable categories, and
            set daily time limits. Works with Jewish / Family-Friendly filters.
          </p>

          <div className="parental-tabs" role="tablist">
            <button
              type="button"
              className={tab === "child" ? "is-active" : ""}
              onClick={() => setTab("child")}
            >
              This is a child’s device
            </button>
            <button
              type="button"
              className={tab === "parent" ? "is-active" : ""}
              onClick={() => setTab("parent")}
            >
              Parent
            </button>
          </div>

          {error ? <p className="parental-error">{error}</p> : null}
          {message ? <p className="parental-ok">{message}</p> : null}

          {tab === "child" ? (
            <div className="parental-block">
              <p className="yt-header-panel-empty">
                {signedIn
                  ? "Show this code to a parent signed in on their device. It refreshes every 5 minutes."
                  : "Sign in on this device as the child account, then show the code to a parent."}
              </p>
              <div className="parental-code" aria-live="polite">
                <span className="parental-code-value">{code || "········"}</span>
                <span className="parental-code-timer">
                  Refreshes in {Math.max(0, expiresIn)}s
                </span>
              </div>
              {!signedIn ? (
                <Link href="/signin" className="yt-header-panel-item" onClick={() => setOpen(false)}>
                  Sign in as child
                </Link>
              ) : null}
              {ownStatus?.linkedToParent ? (
                <p className="parental-status-line">
                  Linked to {ownStatus.parentDisplayName || "a parent"}.
                  {ownStatus.totalSecondsRemaining != null
                    ? ` ${formatRemaining(ownStatus.totalSecondsRemaining)}.`
                    : ""}
                  {ownStatus.disabledCategories.length
                    ? ` Disabled: ${ownStatus.disabledCategories.join(", ")}.`
                    : ""}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="parental-block">
              {!signedIn ? (
                <p className="yt-header-panel-empty">
                  <Link href="/signin" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>{" "}
                  as a parent to link a child and set limits.
                </p>
              ) : (
                <>
                  <label className="parental-label">
                    Enter child’s linking code
                    <div className="parental-row">
                      <input
                        value={linkCode}
                        onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                        maxLength={8}
                        placeholder="ABCD1234"
                        autoCapitalize="characters"
                      />
                      <button type="button" disabled={busy} onClick={() => void linkChild()}>
                        Link
                      </button>
                    </div>
                  </label>

                  {children.length > 0 ? (
                    <>
                      <label className="parental-label">
                        Child
                        <select
                          value={selectedChild}
                          onChange={(e) => setSelectedChild(e.target.value)}
                        >
                          {children.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.display_name || c.username || c.email}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="parental-label">
                        Child’s age (AI assist)
                        <div className="parental-row">
                          <input
                            type="number"
                            min={1}
                            max={17}
                            value={age}
                            onChange={(e) => setAge(Number(e.target.value) || 8)}
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void saveSettings(true)}
                          >
                            Apply age rules
                          </button>
                        </div>
                      </label>

                      <fieldset className="parental-fieldset">
                        <legend>Disable categories</legend>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <label key={opt.slug} className="parental-check">
                            <input
                              type="checkbox"
                              checked={disabled.includes(opt.slug)}
                              onChange={(e) => {
                                setDisabled((prev) =>
                                  e.target.checked
                                    ? [...prev, opt.slug]
                                    : prev.filter((s) => s !== opt.slug),
                                );
                              }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </fieldset>

                      <label className="parental-label">
                        Total minutes per day
                        <input
                          type="number"
                          min={1}
                          placeholder="No limit"
                          value={totalLimit}
                          onChange={(e) =>
                            setTotalLimit(
                              e.target.value === "" ? "" : Number(e.target.value),
                            )
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className="parental-save"
                        disabled={busy}
                        onClick={() => void saveSettings(false)}
                      >
                        Save limits
                      </button>
                    </>
                  ) : (
                    <p className="yt-header-panel-empty">
                      No linked children yet. Enter a code from a child’s device.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
