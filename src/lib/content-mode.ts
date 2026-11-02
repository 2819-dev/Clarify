export const CONTENT_MODE_COOKIE = "clarify_content";
export const CONTENT_MODE_STORAGE_KEY = "clarify_content";

export type ContentMode = "jewish" | "filtered";

export function parseContentMode(raw: string | null | undefined): ContentMode {
  return raw === "filtered" ? "filtered" : "jewish";
}

export function contentModeLabel(mode: ContentMode): string {
  return mode === "filtered" ? "Family-Friendly" : "Jewish";
}

/** Lowercase adjective for natural sentences (“Jewish”, “family-friendly”). */
export function contentModeAdjective(mode: ContentMode): string {
  return mode === "filtered" ? "family-friendly" : "Jewish";
}

export function contentModeDescription(mode: ContentMode): string {
  return mode === "filtered"
    ? "Jewish videos plus family-friendly channels (nature, sleep ambience, secular kids, and more), without coarse language or inappropriate material."
    : "Clearly Jewish content only — shiurim, holidays, Shabbat, Hebrew, Jewish education, Israel/Jewish culture. Not generic family or ambience.";
}
