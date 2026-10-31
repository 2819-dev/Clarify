import type { ContentMode } from "./content-mode";
import { getSql, type Category } from "./db";

function jewishOnly(mode?: ContentMode): boolean {
  return mode !== "filtered";
}

export async function listCategories(mode?: ContentMode): Promise<Category[]> {
  const sql = getSql();
  const onlyJewish = jewishOnly(mode);
  const rows = await sql`
    SELECT cat.slug, cat.name, cat.description, cat.sort_order,
           COUNT(v.id)::int AS video_count
    FROM categories cat
    LEFT JOIN videos v
      ON v.category_slug = cat.slug
     AND v.is_active = TRUE
     AND (
       ${!onlyJewish}::boolean
       OR COALESCE(v.is_jewish, TRUE) = TRUE
     )
    GROUP BY cat.slug, cat.name, cat.description, cat.sort_order
    HAVING COUNT(v.id) > 0
    ORDER BY cat.sort_order ASC, cat.name ASC
  `;
  return rows as Category[];
}

export async function getCategory(
  slug: string,
  mode?: ContentMode,
): Promise<Category | null> {
  const sql = getSql();
  const onlyJewish = jewishOnly(mode);
  const rows = await sql`
    SELECT cat.slug, cat.name, cat.description, cat.sort_order,
           COUNT(v.id)::int AS video_count
    FROM categories cat
    LEFT JOIN videos v
      ON v.category_slug = cat.slug
     AND v.is_active = TRUE
     AND (
       ${!onlyJewish}::boolean
       OR COALESCE(v.is_jewish, TRUE) = TRUE
     )
    WHERE cat.slug = ${slug}
    GROUP BY cat.slug, cat.name, cat.description, cat.sort_order
    LIMIT 1
  `;
  return (rows[0] as Category | undefined) ?? null;
}
