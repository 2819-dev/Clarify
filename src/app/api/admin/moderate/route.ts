import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteComment,
  hideChannel,
  removeVideoFromCatalog,
  requireModeratorUser,
} from "@/lib/moderation";

const schema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("video"),
    videoId: z.string().uuid(),
    action: z.literal("remove"),
  }),
  z.object({
    target: z.literal("channel"),
    channelSlug: z.string().min(1).max(120),
    action: z.literal("hide"),
  }),
  z.object({
    target: z.literal("comment"),
    commentId: z.string().uuid(),
    action: z.literal("delete"),
  }),
]);

export async function POST(request: Request) {
  try {
    await requireModeratorUser();
  } catch {
    return NextResponse.json(
      { error: "Only the Guide admin account can moderate." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid moderation request." }, { status: 400 });
    }

    const data = parsed.data;
    if (data.target === "video") {
      await removeVideoFromCatalog(data.videoId);
      return NextResponse.json({ ok: true, removed: "video" });
    }
    if (data.target === "channel") {
      await hideChannel(data.channelSlug);
      return NextResponse.json({ ok: true, removed: "channel" });
    }
    await deleteComment(data.commentId);
    return NextResponse.json({ ok: true, removed: "comment" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Moderation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
