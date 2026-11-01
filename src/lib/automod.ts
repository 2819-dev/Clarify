export type AutomodResult =
  | { ok: true }
  | { ok: false; flag: string; message: string };

/** Lightweight rule-based AutoMod for comments / free-text. */
const BLOCKED_PATTERNS: { flag: string; re: RegExp; message: string }[] = [
  {
    flag: "slur",
    re: /\b(kike|kikes|nigg(?:a|er)s?|fag+ots?|trann(?:y|ies)|retard(?:ed|s)?)\b/i,
    message: "This comment was hidden by AutoMod.",
  },
  {
    flag: "hate",
    re: /\b(kill\s+(all\s+)?jews|gas\s+the\s+jews|heil\s+hitler|white\s+power)\b/i,
    message: "This comment was hidden by AutoMod.",
  },
  {
    flag: "threat",
    re: /\b(i\s+will\s+(kill|murder|rape)\b|bomb\s+threat)\b/i,
    message: "This comment was hidden by AutoMod.",
  },
  {
    flag: "sexual_minor",
    re: /\b(child\s*porn|cp\b|underage\s+sex|loli(?:con)?)\b/i,
    message: "This comment was hidden by AutoMod.",
  },
  {
    flag: "spam_link_flood",
    re: /(https?:\/\/\S+\s*){4,}/i,
    message: "Too many links — comment hidden by AutoMod.",
  },
  {
    flag: "scam",
    re: /\b(free\s+robux|crypto\s+airdrop|send\s+(me\s+)?bitcoin|whatsapp\s+\+?\d{8,})\b/i,
    message: "This comment looks like spam and was hidden.",
  },
];

export function moderateText(raw: string): AutomodResult {
  const text = raw.trim();
  if (!text) {
    return { ok: false, flag: "empty", message: "Comment cannot be empty." };
  }
  for (const rule of BLOCKED_PATTERNS) {
    if (rule.re.test(text)) {
      return { ok: false, flag: rule.flag, message: rule.message };
    }
  }
  // Extreme repetition (spam)
  if (/(.)\1{12,}/.test(text)) {
    return {
      ok: false,
      flag: "spam_repeat",
      message: "This comment was hidden by AutoMod.",
    };
  }
  return { ok: true };
}
