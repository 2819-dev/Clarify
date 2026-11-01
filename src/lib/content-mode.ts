export const CONTENT_MODE_COOKIE = "clarify_content";
export const CONTENT_MODE_STORAGE_KEY = "clarify_content";

export type ContentMode = "jewish" | "filtered";

export function parseContentMode(raw: string | null | undefined): ContentMode {
  return raw === "filtered" ? "filtered" : "jewish";
}

export function contentModeLabel(mode: ContentMode): string {
  return mode === "filtered" ? "Family-Friendly" : "Jewish";
}

export function contentModeDescription(mode: ContentMode): string {
  return mode === "filtered"
    ? "Jewish videos plus additional family-friendly channels, without coarse language or inappropriate material."
    : "Jewish and Jewish-related videos only.";
}
