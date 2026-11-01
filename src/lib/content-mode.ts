export const CONTENT_MODE_COOKIE = "clarify_content";
export const CONTENT_MODE_STORAGE_KEY = "clarify_content";

export type ContentMode = "jewish" | "filtered";

export function parseContentMode(raw: string | null | undefined): ContentMode {
  return raw === "filtered" ? "filtered" : "jewish";
}

export function contentModeLabel(mode: ContentMode): string {
  return mode === "filtered" ? "Filtered Content" : "Jewish Content";
}

export function contentModeDescription(mode: ContentMode): string {
  return mode === "filtered"
    ? "Jewish catalog plus additional family-safe channels — no curse words or inappropriate content."
    : "Jewish and Jewish-related videos only.";
}
