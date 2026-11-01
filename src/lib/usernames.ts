/** Normalize a public @handle (no leading @). Allows YouTube-style hyphens. */
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[-.]+|[-.]+$/g, "")
    .replace(/--+/g, "-")
    .slice(0, 30);
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9](?:[a-z0-9._-]{0,28}[a-z0-9])?$|^[a-z0-9]$/.test(
    username,
  );
}

export function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] || "viewer";
  let base = normalizeUsername(local.replace(/-/g, "")) || "viewer";
  if (!isValidUsername(base)) {
    base = `u${base}`.replace(/[^a-z0-9]/g, "").slice(0, 30);
  }
  if (!isValidUsername(base)) base = "viewer";
  return base;
}

/** Extract the raw @handle casing from a YouTube channel URL, if present. */
export function rawHandleFromYoutubeUrl(
  youtubeUrl: string | null | undefined,
): string | null {
  if (!youtubeUrl) return null;
  const at = youtubeUrl.match(/youtube\.com\/@([^/?#]+)/i);
  if (!at?.[1]) return null;
  try {
    return decodeURIComponent(at[1]);
  } catch {
    return at[1];
  }
}

/**
 * Prefer the real YouTube @handle from the channel URL.
 * Only fall back to a slug-derived name when no @handle exists.
 */
export function usernameFromChannel(
  youtubeUrl: string | null | undefined,
  slug: string,
): string {
  const raw = rawHandleFromYoutubeUrl(youtubeUrl);
  if (raw) {
    const n = normalizeUsername(raw);
    if (isValidUsername(n)) return n;
  }
  const fromSlug = normalizeUsername(slug.replace(/-/g, ""));
  if (isValidUsername(fromSlug)) return fromSlug;
  return normalizeUsername(slug) || "channel";
}

export function formatAt(username: string | null | undefined): string | null {
  if (!username) return null;
  return `@${username.replace(/^@+/, "")}`;
}
