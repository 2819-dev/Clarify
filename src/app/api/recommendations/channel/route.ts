import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearChannelFeedPref,
  setChannelFeedPref,
} from "@/lib/engagement";
import { getCurrentUser } from "@/lib/user-auth";

const schema = z.object({
  channelSlug: z.string().min(1).max(120),
  action: z.enum(["more", "hide", "clear"]),
});

/**
 * Persist channel feed prefs for signed-in users.
 * Anonymous viewers rely on cookies written by the client; this endpoint
 * returns 204 when there is no session so the client can no-op gracefully.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: true, persisted: false });
  }
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const { channelSlug, action } = parsed.data;
    if (action === "clear") {
      await clearChannelFeedPref(user.id, channelSlug);
      return NextResponse.json({ ok: true, preference: null, persisted: true });
    }
    const preference = await setChannelFeedPref(user.id, channelSlug, action);
    return NextResponse.json({ ok: true, preference, persisted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save preference.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
