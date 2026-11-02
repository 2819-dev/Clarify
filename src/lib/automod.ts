export type AutomodResult =
  | { ok: true }
  | { ok: false; flag: string; message: string };

/** Lightweight rule-based AutoMod for comments / free-text. */
const BLOCKED_PATTERNS: { flag: string; re: RegExp; message: string }[] = [
  {
    flag: "slur",
    re: /\b(kike|kikes|nigg(?:a|er)s?|fag+ots?|trann(?:y|ies)|retard(?:ed|s)?)\b/i,
    message: "This comment couldn’t be posted.",
  },
  {
    flag: "hate",
    re: /\b(kill\s+(all\s+)?jews|gas\s+the\s+jews|heil\s+hitler|white\s+power)\b/i,
    message: "This comment couldn’t be posted.",
  },
  {
    flag: "threat",
    re: /\b(i\s+will\s+(kill|murder|rape)\b|bomb\s+threat)\b/i,
    message: "This comment couldn’t be posted.",
  },
  {
    flag: "sexual_minor",
    re: /\b(child\s*porn|cp\b|underage\s+sex|loli(?:con)?)\b/i,
    message: "This comment couldn’t be posted.",
  },
  {
    flag: "spam_link_flood",
    re: /(https?:\/\/\S+\s*){4,}/i,
    message: "Please remove extra links and try again.",
  },
  {
    flag: "scam",
    re: /\b(free\s+robux|crypto\s+airdrop|send\s+(me\s+)?bitcoin|whatsapp\s+\+?\d{8,})\b/i,
    message: "This comment looks like spam and couldn’t be posted.",
  },
];

export function moderateText(raw: string): AutomodResult {
  const text = raw.trim();
  if (!text) {
    return { ok: false, flag: "empty", message: "Please enter a comment." };
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
      message: "This comment couldn’t be posted.",
    };
  }
  return { ok: true };
}
