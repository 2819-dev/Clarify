import Link from "next/link";
import type { Category } from "@/lib/db";

export function CategoryChips({
  categories,
  activeSlug,
  basePath = "/",
  preserveQuery,
}: {
  categories: Category[];
  activeSlug?: string | null;
  basePath?: string;
  preserveQuery?: string;
}) {
  const qs = preserveQuery ? `?q=${encodeURIComponent(preserveQuery)}` : "";

  return (
    <div className="category-chips" role="navigation" aria-label="Categories">
      <Link
        href={`${basePath}${qs}`}
        className={`category-chip ${!activeSlug ? "is-active" : ""}`}
      >
        All
      </Link>
      {categories.map((cat) => {
        const href =
          basePath === "/"
            ? `/categories/${cat.slug}${qs}`
            : `/categories/${cat.slug}${qs}`;
        return (
          <Link
            key={cat.slug}
            href={href}
            className={`category-chip ${activeSlug === cat.slug ? "is-active" : ""}`}
          >
            {cat.name}
            {typeof cat.video_count === "number" ? (
              <span className="chip-count">{cat.video_count}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
