import Link from "next/link";

function withParams(
  basePath: string,
  params: Record<string, string | undefined | null>,
) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function FormatTabs({
  basePath,
  active = "all",
  q,
  category,
  shortsCount,
}: {
  basePath: string;
  active?: "all" | "videos" | "shorts";
  q?: string;
  category?: string;
  shortsCount?: number;
}) {
  const tabs: { id: "all" | "videos" | "shorts"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "videos", label: "Videos" },
    {
      id: "shorts",
      label:
        typeof shortsCount === "number" ? `Shorts ${shortsCount}` : "Shorts",
    },
  ];

  return (
    <div className="format-tabs" role="tablist" aria-label="Format">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={withParams(basePath, {
            format: tab.id === "all" ? null : tab.id,
            q,
            category,
          })}
          className={`format-tab ${active === tab.id ? "is-active" : ""}`}
          role="tab"
          aria-selected={active === tab.id}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
