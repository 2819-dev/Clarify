import { NextResponse } from "next/server";
import { recordVideoView } from "@/lib/engagement";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { videoId?: string; anonKey?: string };
    const videoId = body.videoId?.trim();
    if (!videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }
    const user = await getCurrentUser();
    const anonKey =
      !user && typeof body.anonKey === "string"
        ? body.anonKey.trim().slice(0, 64)
        : null;
    await recordVideoView({
      videoId,
      userId: user?.id ?? null,
      anonKey,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record view";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
