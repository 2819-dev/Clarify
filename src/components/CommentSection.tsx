"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CommentBody } from "@/components/CommentBody";
import { ModeratorMenu } from "@/components/ModeratorMenu";
import { useCanModerate } from "@/components/ModerationContext";
import { UserAvatar } from "@/components/UserAvatar";
import type { VideoComment } from "@/lib/engagement";
import { formatAt } from "@/lib/usernames";

export function CommentSection({
  videoId,
  initialComments,
  signedIn = false,
}: {
  videoId: string;
  initialComments: VideoComment[];
  signedIn?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const canModerate = useCanModerate();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!signedIn) {
      router.push(`/signin?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, body }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/signin?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!res.ok) {
        setError(data.error || "Could not post comment.");
        return;
      }
      setComments((prev) => [data.comment as VideoComment, ...prev]);
      setBody("");
      router.refresh();
    } catch {
      setError("Could not post comment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="comment-section" aria-label="Comments">
      <h2 className="comment-heading">
        Comments{comments.length ? ` · ${comments.length}` : ""}
      </h2>

      {signedIn ? (
        <form className="comment-form" onSubmit={onSubmit}>
          <label htmlFor="comment-body" className="sr-only">
            Add a comment
          </label>
          <textarea
            id="comment-body"
            rows={3}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            required
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Posting…" : "Comment"}
          </button>
        </form>
      ) : (
        <p className="comment-signin-cta">
          <Link
            href={`/signin?next=${encodeURIComponent(pathname)}`}
            className="btn-comment-signin"
          >
            Sign in to comment
          </Link>
        </p>
      )}

      {comments.length === 0 ? (
        <p className="empty-state">Be the first to comment.</p>
      ) : (
        <ul className="comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="comment-item">
              <div className="comment-identity">
                <UserAvatar
                  name={comment.display_name}
                  avatarUrl={comment.avatar_url}
                  size={40}
                />
                <div className="comment-copy">
                  <div className="comment-item-head">
                    <div>
                      <p className="comment-author">
                        {comment.display_name}
                        {comment.username ? (
                          <>
                            {" "}
                            <a
                              href={`/@${comment.username}`}
                              className="comment-handle"
                            >
                              {formatAt(comment.username)}
                            </a>
                          </>
                        ) : null}
                      </p>
                    </div>
                    {canModerate ? (
                      <ModeratorMenu
                        target="comment"
                        commentId={comment.id}
                        label={comment.display_name}
                        onDone={() =>
                          setComments((prev) =>
                            prev.filter((c) => c.id !== comment.id),
                          )
                        }
                      />
                    ) : null}
                  </div>
                  <CommentBody text={comment.body} />
                  <p className="comment-when">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
