/** YouTube-style relative timestamps with absolute title text. */
export function formatRelativeTime(
  input: string | Date | null | undefined,
  now = new Date(),
): string {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const diffSec = Math.round((now.getTime() - date.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(-Math.sign(diffSec) * abs || 0, "second");
  const mins = Math.round(diffSec / 60);
  if (Math.abs(mins) < 60) return rtf.format(-mins, "minute");
  const hours = Math.round(diffSec / 3600);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  const days = Math.round(diffSec / 86400);
  if (Math.abs(days) < 7) return rtf.format(-days, "day");
  const weeks = Math.round(diffSec / 604800);
  if (Math.abs(weeks) < 5) return rtf.format(-weeks, "week");
  const months = Math.round(diffSec / 2_629_746);
  if (Math.abs(months) < 12) return rtf.format(-months, "month");
  const years = Math.round(diffSec / 31_556_952);
  return rtf.format(-years, "year");
}

export function formatAbsoluteTime(
  input: string | Date | null | undefined,
): string {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
