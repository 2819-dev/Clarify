/** Catalog placeholders that add noise in consumer UI. */
export function isStubDescription(raw: string | null | undefined): boolean {
  const text = raw?.trim() || "";
  if (!text) return true;
  if (/^YouTube Short from\b/i.test(text)) return true;
  if (/^From .+ on YouTube\.?$/i.test(text)) return true;
  if (/^No description\b/i.test(text)) return true;
  return false;
}

export function consumerDescription(
  raw: string | null | undefined,
): string | null {
  const text = raw?.trim() || "";
  if (!text || isStubDescription(text)) return null;
  return text;
}
