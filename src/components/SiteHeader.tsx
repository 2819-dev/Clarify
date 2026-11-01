"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { CatalogSearch } from "@/components/CatalogSearch";
import { ClarifyLogo } from "@/components/ClarifyLogo";
import { ContentModeToggle } from "@/components/ContentModeToggle";
import type { ContentMode } from "@/lib/content-mode";

export function SiteHeader({
  initialMode = "jewish",
}: {
  initialMode?: ContentMode;
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
        <nav className="yt-top-links" aria-label="Account">
          <Link
            href="/admin/login"
            className={pathname.startsWith("/admin") ? "is-active" : "nav-quiet"}
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
