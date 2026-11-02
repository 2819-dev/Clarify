import { NextResponse } from "next/server";
import { z } from "zod";
import { addComment, listComments } from "@/lib/engagement";
import { COMMENTS_ENABLED } from "@/lib/features";
import { getCurrentUser } from "@/lib/user-auth";

const postSchema = z.object({
  videoId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

const disabledResponse = () =>
  NextResponse.json(
    {
      error: "Comments are temporarily disabled.",
      code: "comments_disabled",
    },
    { status: 403 },
  );

export async function GET(request: Request) {
  if (!COMMENTS_ENABLED) return disabledResponse();

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  if (!videoId) {
    return NextResponse.json({ error: "Video is required." }, { status: 400 });
  }
  const comments = await listComments(videoId);
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  if (!COMMENTS_ENABLED) return disabledResponse();

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to comment.", code: "auth_required" },
      { status: 401 },
    );
  }
  try {
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter a comment (1–2000 characters)." },
        { status: 400 },
      );
    }
    const comment = await addComment(
      user.id,
      parsed.data.videoId,
      parsed.data.body,
    );
    return NextResponse.json({ comment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not comment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
