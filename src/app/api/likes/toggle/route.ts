import { NextResponse } from "next/server";
import { z } from "zod";
import { toggleLike } from "@/lib/engagement";
import { getCurrentUser } from "@/lib/user-auth";

const schema = z.object({
  videoId: z.string().uuid(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to like videos.", code: "auth_required" },
      { status: 401 },
    );
  }
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Video required." }, { status: 400 });
    }
    const state = await toggleLike(user.id, parsed.data.videoId);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not like.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
