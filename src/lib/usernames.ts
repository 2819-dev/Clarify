/** Normalize a public @handle (no leading @). */
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 30);
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])?$|^[a-z0-9]$/.test(username);
}

export function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] || "viewer";
  let base = normalizeUsername(local) || "viewer";
  if (!isValidUsername(base)) base = `u${base}`.replace(/[^a-z0-9]/g, "").slice(0, 30);
  if (!isValidUsername(base)) base = "viewer";
  return base;
}

export function usernameFromChannel(
  youtubeUrl: string | null | undefined,
  slug: string,
): string {
  if (youtubeUrl) {
    const at = youtubeUrl.match(/youtube\.com\/@([^/?#]+)/i);
    if (at?.[1]) {
      const n = normalizeUsername(decodeURIComponent(at[1]));
      if (isValidUsername(n)) return n;
    }
  }
  const fromSlug = normalizeUsername(slug.replace(/-/g, ""));
  if (isValidUsername(fromSlug)) return fromSlug;
  return normalizeUsername(slug) || "channel";
}

export function formatAt(username: string | null | undefined): string | null {
  if (!username) return null;
  return `@${username.replace(/^@+/, "")}`;
}
