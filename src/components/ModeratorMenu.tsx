"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type ModTarget =
  | { target: "video"; videoId: string; label?: string; onDone?: () => void }
  | {
      target: "channel";
      channelSlug: string;
      label?: string;
      onDone?: () => void;
    }
  | {
      target: "comment";
      commentId: string;
      label?: string;
      onDone?: () => void;
    };

export function ModeratorMenu(props: ModTarget) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const actionLabel =
    props.target === "video"
      ? "Remove video"
      : props.target === "channel"
        ? "Hide channel"
        : "Delete comment";

  const confirmMessage =
    props.target === "video"
      ? "Remove this video from Clarify?"
      : props.target === "channel"
        ? "Hide this channel and remove its videos from Clarify?"
        : "Delete this comment permanently?";

  async function runAction() {
    if (!window.confirm(confirmMessage)) {
      setOpen(false);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const body =
        props.target === "video"
          ? { target: "video", videoId: props.videoId, action: "remove" }
          : props.target === "channel"
            ? {
                target: "channel",
                channelSlug: props.channelSlug,
                action: "hide",
              }
            : {
                target: "comment",
                commentId: props.commentId,
                action: "delete",
              };
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not complete that action.");
        return;
      }
      setOpen(false);
      props.onDone?.();
      if (props.target === "video" || props.target === "channel") {
        router.push(props.target === "channel" ? "/channels" : "/");
      }
      router.refresh();
    } catch {
      setError("Could not complete that action.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mod-menu" ref={rootRef}>
      <button
        type="button"
        className="mod-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="Moderator actions"
        aria-label={`Moderator actions${props.label ? ` for ${props.label}` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open ? (
        <div className="mod-menu-panel" role="menu" id={menuId}>
          <button
            type="button"
            role="menuitem"
            className="mod-menu-item is-danger"
            disabled={pending}
            onClick={runAction}
          >
            {pending ? "Removing…" : actionLabel}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
