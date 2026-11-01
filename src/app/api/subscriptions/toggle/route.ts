import { NextResponse } from "next/server";
import { z } from "zod";
import { toggleSubscription } from "@/lib/engagement";
import { getCurrentUser } from "@/lib/user-auth";

const schema = z.object({
  channelSlug: z.string().min(1).max(120),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to subscribe.", code: "auth_required" },
      { status: 401 },
    );
  }
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Channel required." }, { status: 400 });
    }
    const subscribed = await toggleSubscription(
      user.id,
      parsed.data.channelSlug,
    );
    return NextResponse.json({ subscribed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not subscribe.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
