"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { CatalogSearch } from "@/components/CatalogSearch";
import { ClarifyLogo } from "@/components/ClarifyLogo";
import { ContentModeToggle } from "@/components/ContentModeToggle";
import { UserMenu } from "@/components/UserMenu";
import type { ContentMode } from "@/lib/content-mode";

function KeyIcon() {
  return (
    <svg
      className="admin-key-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M14.5 8.5a4 4 0 1 0-3.4 3.95L7 16.55V19h2.5l1.2-1.2 1.1 1.1 1.7-1.7-1.1-1.1L15 13.9A4 4 0 0 0 14.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="15.2" cy="8.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader({
  initialMode = "jewish",
  user = null,
  showAdminKey = false,
}: {
  initialMode?: ContentMode;
  user?: { email: string; display_name: string } | null;
  showAdminKey?: boolean;
}) {
  const pathname = usePathname() || "/";
  const searchAction = pathname.startsWith("/categories/")
    ? pathname
    : pathname.startsWith("/channels/")
      ? pathname
      : "/";

  return (
    <header className="yt-topbar">
      <div className="yt-topbar-left">
        <ClarifyLogo size="md" />
        <span className="yt-made-by">
          by{" "}
          <a href="https://guidelearning.org" rel="noopener noreferrer">
            Guide
          </a>
        </span>
      </div>
      <div className="yt-topbar-search">
        <Suspense fallback={null}>
          <CatalogSearch
            action={searchAction}
            placeholder="Search Clarify…"
          />
        </Suspense>
      </div>
      <div className="yt-topbar-right">
        <ContentModeToggle initialMode={initialMode} />
        <UserMenu user={user} />
        {showAdminKey ? (
          <Link
            href="/admin/login"
            className={`admin-key-link ${
              pathname.startsWith("/admin") ? "is-active" : ""
            }`}
            title="Admin"
            aria-label="Admin"
          >
            <KeyIcon />
          </Link>
        ) : null}
      </div>
    </header>
  );
}
