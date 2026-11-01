import Link from "next/link";
import type { Category } from "@/lib/db";

export function CategoryRail({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string | null;
}) {
  return (
    <div className="yt-chip-rail" role="navigation" aria-label="Categories">
      <div className="yt-chip-rail-track">
        <Link
          href="/"
          className={`yt-chip ${!activeSlug ? "is-active" : ""}`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categories/${cat.slug}`}
            className={`yt-chip ${activeSlug === cat.slug ? "is-active" : ""}`}
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
