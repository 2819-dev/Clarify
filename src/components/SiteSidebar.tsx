"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Category } from "@/lib/db";

export function SiteSidebar({
  categories = [],
}: {
  categories?: Pick<Category, "slug" | "name" | "video_count">[];
}) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const format = searchParams.get("format");

  const links = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/" && format !== "shorts",
      icon: "⌂",
    },
    {
      href: "/?format=shorts",
      label: "Shorts",
      active: pathname === "/" && format === "shorts",
      icon: "▷",
    },
    {
      href: "/categories",
      label: "Categories",
      active: pathname.startsWith("/categories"),
      icon: "▦",
    },
    {
      href: "/channels",
      label: "Channels",
      active: pathname.startsWith("/channels"),
      icon: "◎",
    },
  ];

  return (
    <aside className="yt-sidebar" aria-label="Browse">
      <nav className="yt-sidebar-nav">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`yt-sidebar-link ${item.active ? "is-active" : ""}`}
            aria-current={item.active ? "page" : undefined}
          >
            <span className="yt-sidebar-icon" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {categories.length > 0 ? (
        <div className="yt-sidebar-section">
          <p className="yt-sidebar-heading">Categories</p>
          <nav className="yt-sidebar-cats" aria-label="Categories">
            {categories.slice(0, 16).map((cat) => {
              const active = pathname === `/categories/${cat.slug}`;
              return (
                <Link
                  key={cat.slug}
                  href={`/categories/${cat.slug}`}
                  className={`yt-sidebar-link ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="yt-sidebar-cat-name">{cat.name}</span>
                  {typeof cat.video_count === "number" ? (
                    <span className="yt-sidebar-count">{cat.video_count}</span>
                  ) : null}
                </Link>
              );
            })}
            <Link href="/categories" className="yt-sidebar-more">
              All categories
            </Link>
          </nav>
        </div>
      ) : null}

      <p className="yt-sidebar-made">
        Made by{" "}
        <a href="https://guidelearning.org" rel="noopener noreferrer">
          Guide
        </a>
      </p>
    </aside>
  );
}
