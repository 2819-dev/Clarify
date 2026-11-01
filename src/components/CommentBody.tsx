"use client";

import { renderTextWithMentions } from "@/lib/mentions";

export function CommentBody({ text }: { text: string }) {
  return <p className="comment-body">{renderTextWithMentions(text)}</p>;
}
