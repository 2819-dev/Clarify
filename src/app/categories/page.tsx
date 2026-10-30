import Link from "next/link";
import { listCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function CategoriesIndexPage() {
  const categories = await listCategories();

  return (
    <section className="section catalog-page">
      <div className="section-heading">
        <h2>Categories</h2>
        <p>Browse the library by theme.</p>
      </div>
      <div className="entity-grid">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categories/${cat.slug}`}
            className="entity-tile"
          >
            <h3>{cat.name}</h3>
            <p>{cat.description}</p>
            <span className="entity-count">
              {cat.video_count ?? 0} video{(cat.video_count ?? 0) === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
