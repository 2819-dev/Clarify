import { getSql, type Category } from "./db";

export async function listCategories(): Promise<Category[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT cat.slug, cat.name, cat.description, cat.sort_order,
           COUNT(v.id)::int AS video_count
    FROM categories cat
    LEFT JOIN videos v
      ON v.category_slug = cat.slug AND v.is_active = TRUE
    GROUP BY cat.slug, cat.name, cat.description, cat.sort_order
    HAVING COUNT(v.id) > 0
    ORDER BY cat.sort_order ASC, cat.name ASC
  `;
  return rows as Category[];
}

export async function getCategory(slug: string): Promise<Category | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT cat.slug, cat.name, cat.description, cat.sort_order,
           COUNT(v.id)::int AS video_count
    FROM categories cat
    LEFT JOIN videos v
      ON v.category_slug = cat.slug AND v.is_active = TRUE
    WHERE cat.slug = ${slug}
    GROUP BY cat.slug, cat.name, cat.description, cat.sort_order
    LIMIT 1
  `;
  return (rows[0] as Category | undefined) ?? null;
}
