/** Client + shared keys for local Clarify preferences (no public accounts). */

export const SUBS_COOKIE = "clarify_subs";
export const SUBS_STORAGE_KEY = "clarify_subs";
export const ACTIVITY_COOKIE = "clarify_activity";
export const ACTIVITY_STORAGE_KEY = "clarify_activity";

export const PREFS_EVENT = "clarify-prefs-changed";

export function parseSlugList(raw: string | null | undefined, max = 40): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const slug = part.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= max) break;
  }
  return out;
}

export function serializeSlugList(slugs: string[]): string {
  return [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))]
    .slice(0, 40)
    .join(",");
}

export type WatchActivity = {
  channelSlugs: string[];
  categorySlugs: string[];
};

export function parseActivity(raw: string | null | undefined): WatchActivity {
  if (!raw) return { channelSlugs: [], categorySlugs: [] };
  try {
    if (raw.trim().startsWith("{")) {
      const data = JSON.parse(raw) as Partial<WatchActivity>;
      return {
        channelSlugs: parseSlugList((data.channelSlugs || []).join(","), 20),
        categorySlugs: parseSlugList((data.categorySlugs || []).join(","), 20),
      };
    }
  } catch {
    /* fall through — treat as channel slug list */
  }
  return { channelSlugs: parseSlugList(raw, 20), categorySlugs: [] };
}

export function serializeActivity(activity: WatchActivity): string {
  return JSON.stringify({
    channelSlugs: parseSlugList(activity.channelSlugs.join(","), 20),
    categorySlugs: parseSlugList(activity.categorySlugs.join(","), 20),
  });
}
