import Link from "next/link";
import type { ReactNode } from "react";

const MENTION_RE = /(@[a-z0-9][a-z0-9._]{0,29})/gi;

/** Render @handles as links to /@username (channels or users resolve server-side). */
export function renderTextWithMentions(text: string): ReactNode[] {
  const parts = text.split(MENTION_RE);
  return parts.map((part, i) => {
    if (MENTION_RE.test(part)) {
      MENTION_RE.lastIndex = 0;
      const handle = part.slice(1);
      return (
        <Link key={`${part}-${i}`} href={`/@${handle}`} className="mention-link">
          {part}
        </Link>
      );
    }
    MENTION_RE.lastIndex = 0;
    return <span key={`t-${i}`}>{part}</span>;
  });
}
