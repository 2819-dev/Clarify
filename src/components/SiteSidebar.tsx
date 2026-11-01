"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Category, Channel } from "@/lib/db";
import { PREFS_EVENT } from "@/lib/preferences";
import {
  getSubscriptionsClient,
  hydratePreferencesCookies,
} from "@/lib/preferences-client";

export function SiteSidebar({
  categories = [],
  subscribedChannels = [],
}: {
  categories?: Pick<Category, "slug" | "name" | "video_count">[];
  subscribedChannels?: Pick<
    Channel,
    "slug" | "name" | "avatar_url" | "video_count"
  >[];
}) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const format = searchParams.get("format");
  const [subSlugs, setSubSlugs] = useState<string[]>(
    subscribedChannels.map((c) => c.slug),
  );

  useEffect(() => {
    hydratePreferencesCookies();
    const sync = () => setSubSlugs(getSubscriptionsClient());
    sync();
    window.addEventListener(PREFS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PREFS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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
      href: "/subscriptions",
      label: "Subscriptions",
      active: pathname.startsWith("/subscriptions"),
      icon: "✦",
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

  const subSet = new Set(subSlugs);
  const visibleSubs = subscribedChannels.filter((c) => subSet.has(c.slug));

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

      <div className="yt-sidebar-section">
        <p className="yt-sidebar-heading">Subscriptions</p>
        {visibleSubs.length === 0 ? (
          <p className="yt-sidebar-empty">
            Subscribe on a channel page — saved on this device.
          </p>
        ) : (
          <nav className="yt-sidebar-cats" aria-label="Subscriptions">
            {visibleSubs.map((ch) => {
              const active = pathname === `/channels/${ch.slug}`;
              return (
                <Link
                  key={ch.slug}
                  href={`/channels/${ch.slug}`}
                  className={`yt-sidebar-link yt-sidebar-sub ${
                    active ? "is-active" : ""
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {ch.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ch.avatar_url}
                      alt=""
                      className="yt-sidebar-avatar"
                    />
                  ) : (
                    <span className="yt-sidebar-avatar placeholder" aria-hidden />
                  )}
                  <span className="yt-sidebar-cat-name">{ch.name}</span>
                </Link>
              );
            })}
            <Link href="/subscriptions" className="yt-sidebar-more">
              All subscriptions
            </Link>
          </nav>
        )}
      </div>

      {categories.length > 0 ? (
        <div className="yt-sidebar-section">
          <p className="yt-sidebar-heading">Categories</p>
          <nav className="yt-sidebar-cats" aria-label="Categories">
            {categories.map((cat) => {
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
