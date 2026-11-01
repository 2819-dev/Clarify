"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";

type MenuUser = {
  id?: string;
  email: string;
  display_name: string;
  username?: string | null;
  avatar_url?: string | null;
};

function MenuIcon({ kind }: { kind: "account" | "settings" | "security" | "signout" }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true as const,
  };
  if (kind === "account") {
    return (
      <svg {...common}>
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    );
  }
  if (kind === "settings") {
    return (
      <svg {...common}>
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.49.49 0 0 0-.59.22L2.63 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.75 14.52a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.3.59.22l2.39-.96c.5.39 1.04.71 1.63.94l.36 2.54c.05.24.24.41.48.41h4c.24 0 .43-.17.48-.41l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
      </svg>
    );
  }
  if (kind === "security") {
    return (
      <svg {...common}>
        <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
    </svg>
  );
}

export function UserMenu({ user }: { user: MenuUser | null }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  if (!user) {
    return (
      <Link href="/signin" className="yt-signin-chip" aria-label="Sign in">
        <span className="yt-signin-icon" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M5.5 19c1.6-3 4-4.5 6.5-4.5S17 16 18.5 19"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="yt-signin-label">Sign in</span>
      </Link>
    );
  }

  const handle = user.username ? `@${user.username}` : user.email;
  const profileHref = user.username ? `/@${user.username}` : "/account";

  return (
    <div className="yt-account-menu" ref={rootRef}>
      <button
        type="button"
        className="yt-avatar-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={handle}
        onClick={() => setOpen((v) => !v)}
      >
        <UserAvatar
          name={user.display_name || user.username || user.email}
          avatarUrl={user.avatar_url}
          size={32}
        />
      </button>

      {open ? (
        <div className="yt-account-panel" role="menu" id={menuId}>
          <div className="yt-account-head">
            <UserAvatar
              name={user.display_name || user.username || user.email}
              avatarUrl={user.avatar_url}
              size={40}
            />
            <div className="yt-account-head-copy">
              <p className="yt-account-name">{user.display_name}</p>
              <p className="yt-account-handle">{handle}</p>
              <Link
                href={profileHref}
                className="yt-account-view"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                View profile
              </Link>
            </div>
          </div>

          <div className="yt-account-sep" />

          <Link
            href="/account"
            className="yt-account-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <MenuIcon kind="account" />
            Your account
          </Link>
          <Link
            href="/account"
            className="yt-account-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <MenuIcon kind="settings" />
            Settings
          </Link>
          <Link
            href="/account/security"
            className="yt-account-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <MenuIcon kind="security" />
            Security
          </Link>

          <div className="yt-account-sep" />

          <button
            type="button"
            className="yt-account-item"
            role="menuitem"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await fetch("/api/auth/logout", { method: "POST" });
              setOpen(false);
              router.refresh();
              setPending(false);
            }}
          >
            <MenuIcon kind="signout" />
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
