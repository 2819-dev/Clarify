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
    ? "Family-friendly library including Jewish makers plus suitable non-Jewish creators (nature, kids, about-Jews topics, and more)."
    : "Videos from Jewish creators and makers — educators, musicians, Jewish orgs — not merely topics about Jews.";
}
