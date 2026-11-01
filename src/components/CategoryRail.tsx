import Link from "next/link";
import type { Category } from "@/lib/db";

const RAIL_LIMIT = 10;

export function CategoryRail({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string | null;
}) {
  const active = activeSlug
    ? categories.find((c) => c.slug === activeSlug)
    : null;
  let rail = categories.slice(0, RAIL_LIMIT);
  if (active && !rail.some((c) => c.slug === active.slug)) {
    rail = [...rail.slice(0, RAIL_LIMIT - 1), active];
  }
  const hasMore = categories.length > RAIL_LIMIT;

  return (
    <div className="yt-chip-rail" role="navigation" aria-label="Categories">
      <div className="yt-chip-rail-track">
        <Link
          href={activeSlug ? "/categories" : "/"}
          className={`yt-chip ${!activeSlug ? "is-active" : ""}`}
        >
          All
        </Link>
        {rail.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categories/${cat.slug}`}
            className={`yt-chip ${activeSlug === cat.slug ? "is-active" : ""}`}
          >
            {cat.name}
          </Link>
        ))}
        {hasMore ? (
          <Link href="/categories" className="yt-chip yt-chip-more">
            More
          </Link>
        ) : null}
      </div>
    </div>
  );
}
