"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ContentModeToggle } from "@/components/ContentModeToggle";
import type { ContentMode } from "@/lib/content-mode";
import type { Category, Channel } from "@/lib/db";

function NavIcon({ name }: { name: "home" | "shorts" | "subs" | "cats" | "channels" }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true as const,
  };
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    );
  }
  if (name === "shorts") {
    return (
      <svg {...common}>
        <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94l-1.2-.5C3.48 5.8 1.47 6.33.74 7.82s.1 3.25 1.59 4.01l1.2.5-1.2.5c-1.49.76-2.32 2.52-1.59 4.01s2.74 2.02 4.23 1.26l1.2-.5L14.5 20.5c1.83.96 4.24.27 5.2-1.56s.27-4.1-1.56-5.07l-1.2-.5 1.2-.5c1.49-.76 2.32-2.52 1.59-4.01z" />
      </svg>
    );
  }
  if (name === "subs") {
    return (
      <svg {...common}>
        <path d="M10 18v-6l5 3-5 3zm7-15H7v2h10V3zm3 4H4v2h16V7zm2 4H2v10h20V11z" />
      </svg>
    );
  }
  if (name === "cats") {
    return (
      <svg {...common}>
        <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22z" />
    </svg>
  );
}

export function SiteSidebar({
  categories = [],
  subscribedChannels = [],
  signedIn = false,
  initialMode = "jewish",
}: {
  categories?: Pick<Category, "slug" | "name" | "video_count">[];
  subscribedChannels?: Pick<
    Channel,
    "slug" | "name" | "avatar_url" | "video_count"
  >[];
  signedIn?: boolean;
  initialMode?: ContentMode;
}) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const format = searchParams.get("format");

  function closeMobileNav() {
    document.documentElement.classList.remove("yt-nav-open");
  }

  const links = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/" && format !== "shorts",
      icon: "home" as const,
    },
    {
      href: "/?format=shorts",
      label: "Shorts",
      active: pathname === "/" && format === "shorts",
      icon: "shorts" as const,
    },
    {
      href: "/subscriptions",
      label: "Subscriptions",
      active: pathname.startsWith("/subscriptions"),
      icon: "subs" as const,
    },
    {
      href: "/categories",
      label: "Categories",
      active: pathname.startsWith("/categories"),
      icon: "cats" as const,
    },
    {
      href: "/channels",
      label: "Channels",
      active: pathname.startsWith("/channels"),
      icon: "channels" as const,
    },
  ];

  const visibleSubs = subscribedChannels.slice(0, 7);

  return (
    <aside className="yt-sidebar" aria-label="Browse">
      <nav className="yt-sidebar-nav">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`yt-sidebar-link ${item.active ? "is-active" : ""}`}
            aria-current={item.active ? "page" : undefined}
            title={item.label}
            onClick={closeMobileNav}
          >
            <span className="yt-sidebar-icon" aria-hidden>
              <NavIcon name={item.icon} />
            </span>
            <span className="yt-sidebar-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="yt-sidebar-section yt-sidebar-mode">
        <p className="yt-sidebar-heading">What to show</p>
        <ContentModeToggle initialMode={initialMode} />
      </div>

      <div className="yt-sidebar-section">
        <p className="yt-sidebar-heading">Subscriptions</p>
        {!signedIn ? (
          <p className="yt-sidebar-empty">
            <Link href={`/signin?next=${encodeURIComponent(pathname)}`}>
              Sign in
            </Link>{" "}
            to see your subscriptions.
          </p>
        ) : visibleSubs.length === 0 ? (
          <p className="yt-sidebar-empty">
            Subscribe to a channel to keep it here.
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
                  title={ch.name}
                  onClick={closeMobileNav}
                >
                  {ch.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ch.avatar_url}
                      alt=""
                      className="yt-sidebar-avatar"
                    />
                  ) : (
                    <span className="yt-sidebar-avatar placeholder" aria-hidden>
                      {(ch.name[0] || "?").toUpperCase()}
                    </span>
                  )}
                  <span className="yt-sidebar-label yt-sidebar-cat-name">
                    {ch.name}
                  </span>
                </Link>
              );
            })}
            <Link
              href="/subscriptions"
              className="yt-sidebar-more"
              onClick={closeMobileNav}
            >
              All subscriptions
            </Link>
          </nav>
        )}
      </div>

      {categories.length > 0 ? (
        <div className="yt-sidebar-section">
          <p className="yt-sidebar-heading">Explore</p>
          <nav className="yt-sidebar-cats" aria-label="Categories">
            {categories.slice(0, 8).map((cat) => {
              const active = pathname === `/categories/${cat.slug}`;
              return (
                <Link
                  key={cat.slug}
                  href={`/categories/${cat.slug}`}
                  className={`yt-sidebar-link ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={cat.name}
                  onClick={closeMobileNav}
                >
                  <span className="yt-sidebar-label yt-sidebar-cat-name">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
            <Link
              href="/categories"
              className="yt-sidebar-more"
              onClick={closeMobileNav}
            >
              All categories
            </Link>
          </nav>
        </div>
      ) : null}

      <p className="yt-sidebar-made">
        From{" "}
        <a href="https://guidelearning.org" rel="noopener noreferrer">
          Guide
        </a>
      </p>
    </aside>
  );
}
