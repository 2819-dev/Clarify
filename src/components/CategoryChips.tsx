import Link from "next/link";
import type { Category } from "@/lib/db";

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

export function CategoryChips({
  categories,
  activeSlug,
  basePath = "/",
  preserveQuery,
  preserveFormat,
  mode = "path",
}: {
  categories: Category[];
  activeSlug?: string | null;
  basePath?: string;
  preserveQuery?: string;
  preserveFormat?: string;
  /** path: /categories/[slug]. query: ?category= on basePath (for channel pages). */
  mode?: "path" | "query";
}) {
  const extras = {
    q: preserveQuery,
    format: preserveFormat && preserveFormat !== "all" ? preserveFormat : null,
  };
  const allHref =
    mode === "query"
      ? withParams(basePath, extras)
      : withParams("/", extras);

  return (
    <div className="category-chips" role="navigation" aria-label="Categories">
      <Link
        href={allHref}
        className={`category-chip ${!activeSlug ? "is-active" : ""}`}
      >
        All
      </Link>
      {categories.map((cat) => {
        const href =
          mode === "query"
            ? withParams(basePath, {
                category: cat.slug,
                ...extras,
              })
            : withParams(`/categories/${cat.slug}`, extras);
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
