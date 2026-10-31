import Link from "next/link";

export type ChannelTab = "home" | "videos" | "shorts" | "about";

export function ChannelTabs({
  slug,
  active,
  shortsCount = 0,
}: {
  slug: string;
  active: ChannelTab;
  shortsCount?: number;
}) {
  const tabs: { id: ChannelTab; label: string; hide?: boolean }[] = [
    { id: "home", label: "Home" },
    { id: "videos", label: "Videos" },
    {
      id: "shorts",
      label: shortsCount > 0 ? `Shorts` : "Shorts",
      hide: shortsCount <= 0,
    },
    { id: "about", label: "About" },
  ];

  return (
    <nav className="channel-yt-tabs" aria-label="Channel sections">
      {tabs
        .filter((t) => !t.hide)
        .map((tab) => {
          const href =
            tab.id === "home"
              ? `/channels/${slug}`
              : `/channels/${slug}?tab=${tab.id}`;
          return (
            <Link
              key={tab.id}
              href={href}
              className={`channel-yt-tab ${active === tab.id ? "is-active" : ""}`}
              aria-current={active === tab.id ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
    </nav>
  );
}
